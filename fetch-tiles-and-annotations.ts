import url from 'url'
import fs from 'graceful-fs'
import path from 'path'
import { parse } from 'yaml'
import { Readable } from 'stream'
import { finished } from 'stream/promises'
import { mkdirp } from 'mkdirp'
import chalk from 'chalk'

import { generateId, generateChecksum } from '@allmaps/id'
import {
  parseAnnotation,
  generateAnnotation,
  type Map
} from '@allmaps/annotation'
import { fetchJson, fetchImageInfo } from '@allmaps/stdlib'
import { Image, type ImageRequest } from '@allmaps/iiif-parser'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const yamlConfigUrl = process.env.ARCADE_YAML_CONFIG_URL

if (!yamlConfigUrl) {
  throw new Error('No ARCADE_YAML_CONFIG_URL environment variable set')
}

const maxImageDimension = 16_384

async function getConfiguration(yamlConfigUrl: string) {
  const yamlConfig = await fetch(yamlConfigUrl).then((response) =>
    response.text()
  )
  return parse(yamlConfig)
}

function scaleTile(
  { region, size }: ImageRequest,
  scale: number
): ImageRequest {
  return {
    region: region && {
      x: Math.round(region.x / scale),
      y: Math.round(region.y / scale),
      width: Math.round(region.width / scale),
      height: Math.round(region.height / scale)
    },
    size
  }
}

function scaleGcps(
  gcps: {
    resource: [number, number]
    geo: [number, number]
  }[],
  scale: number
): typeof gcps {
  return gcps.map(({ resource, geo }) => ({
    resource: [
      Math.round(resource[0] / scale),
      Math.round(resource[1] / scale)
    ],
    geo
  }))
}

function scaleResourceMask(
  resourceMask: [number, number][],
  scale: number
): typeof resourceMask {
  return resourceMask.map(([x, y]) => [
    Math.round(x / scale),
    Math.round(y / scale)
  ])
}

function getMaxScaleFactorForTile(
  imageWidth: number,
  imageHeight: number,
  tileWidth: number,
  tileHeight: number | undefined
) {
  if (!tileHeight) {
    tileHeight = tileWidth
  }

  return (
    2 **
    Math.floor(
      Math.log2(Math.max(imageWidth / tileWidth, imageHeight / tileHeight))
    )
  )
}

/**
 * Fetches a URL and saves it to  `destinationFilename`.
 * If the file already exists, loads existing version and returns contents
 * @param url
 * @param destinationFilename
 * @returns The contents of the URL or file
 */
async function fetchJsonToFs(url: string, destinationFilename: string) {
  const fileExists = fs.existsSync(destinationFilename)

  if (fileExists) {
    console.log(
      chalk.green('Skipping'),
      chalk.underline(url),
      'to',
      chalk.underline(destinationFilename),
      chalk.green.bold('loading from disk')
    )
    return JSON.parse(fs.readFileSync(destinationFilename, 'utf-8'))
  } else {
    console.log(
      chalk.blue('Downloading'),
      chalk.underline(url),
      'to',
      chalk.underline(destinationFilename)
    )

    const response = await fetch(url)
    const json = await response.json()

    await mkdirp(path.dirname(destinationFilename))
    fs.writeFileSync(
      destinationFilename,
      JSON.stringify(json, null, 2),
      'utf-8'
    )

    return json
  }
}

async function downloadTilesForMap(annotationUrl: string, map: Map) {
  let mapId = await generateChecksum(map)

  if (map.id?.startsWith('http')) {
    const match = map.id.match(/maps\/(?<mapId>\w*)$/)

    if (match?.groups?.mapId) {
      mapId = match?.groups?.mapId
    }
  } else if (map.id?.length === 16) {
    mapId = map.id
  }

  const singleMapAnnotationFilename = path.join(
    __dirname,
    'files',
    'annotations',
    'maps',
    `${mapId}.json`
  )

  if (fs.existsSync(singleMapAnnotationFilename)) {
    console.log(
      chalk.green('Skipping, already exists:'),
      chalk.underline(singleMapAnnotationFilename)
    )

    return
  }

  const imageId = await generateId(map.resource.id)

  const imageInfoFilename = path.join(
    __dirname,
    'files',
    'iiif',
    'images',
    imageId,
    'info.json'
  )

  const imageInfo = await fetchImageInfo(map.resource.id)

  if (!(imageInfo as any).tiles) {
    console.log(
      chalk.red('Skipping'),
      chalk.underline(`${map.resource.id}/info.json`),
      'from',
      chalk.underline(annotationUrl),
      'image does not have tiles'
    )
    return
  }

  const parsedImage = Image.parse(imageInfo)

  // if (fs.existsSync(imageInfoFilename)) {
  //   console.log(
  //     chalk.green('Skipping'),
  //     chalk.underline(`${map.resource.id}/info.json`)
  //   )
  // } else {
  console.log(
    chalk.blue('Downloading'),
    chalk.underline(`${map.resource.id}/info.json`),
    'to',
    chalk.green(imageId)
  )

  let minScaleFactor: number | undefined

  if (
    map.resource.width > maxImageDimension ||
    map.resource.height > maxImageDimension
  ) {
    const minDownScale =
      Math.max(map.resource.width, map.resource.height) / maxImageDimension

    // round minDownScale to the nearest power of 2
    minScaleFactor = Math.pow(2, Math.ceil(Math.log2(minDownScale)))
  }

  console.log(
    chalk.yellow('  Minimum scaleFactor:'),
    minScaleFactor ? minScaleFactor : 'none'
  )

  console.log(
    'Image dimensions:',
    `${map.resource.width}, ${map.resource.height}`,
    minScaleFactor
      ? chalk.green(
          '→',
          `${Math.round(map.resource.width / minScaleFactor)}, ${Math.round(
            map.resource.height / minScaleFactor
          )}`
        )
      : ''
  )

  const scaledImageWidth = minScaleFactor
    ? Math.round(parsedImage.width / minScaleFactor)
    : parsedImage.width
  const scaledImageHeight = minScaleFactor
    ? Math.round(parsedImage.height / minScaleFactor)
    : parsedImage.height

  console.log('Downloading tiles:')

  for (let [
    tileZoomLevelIndex,
    tileZoomLevel
  ] of parsedImage.tileZoomLevels.entries()) {
    const maxScaleFactor = getMaxScaleFactorForTile(
      parsedImage.width,
      parsedImage.height,
      tileZoomLevel.width,
      tileZoomLevel.height
    )

    if (
      (!minScaleFactor || tileZoomLevel.scaleFactor >= minScaleFactor) &&
      tileZoomLevel.scaleFactor <= maxScaleFactor
    ) {
      console.log(
        chalk.blue(`  Scale factor ${tileZoomLevel.scaleFactor}`),
        `${tileZoomLevelIndex + 1} / ${parsedImage.tileZoomLevels.length}`,
        minScaleFactor
          ? chalk.yellow(
              `${tileZoomLevel.scaleFactor} → ${
                tileZoomLevel.scaleFactor / minScaleFactor
              }`
            )
          : ''
      )
      let fileCount = 1
      let fileCountTotal = tileZoomLevel.columns * tileZoomLevel.rows
      for (const column of Array(tileZoomLevel.columns).fill(0).keys()) {
        for (const row of Array(tileZoomLevel.rows).fill(0).keys()) {
          const iiifTile = parsedImage.getIiifTile(tileZoomLevel, column, row)
          const imageUrl = parsedImage.getImageUrl(iiifTile)

          const scaledIiifTile = scaleTile(iiifTile, minScaleFactor || 1)

          const match = parsedImage
            .getImageUrl(scaledIiifTile)
            .match(/\d+,\d+,\d+,\d+\/\d+.\d*\/\d\/\w+\.\w+$/)

          if (!match) {
            console.log('Error:', parsedImage.getImageUrl(scaledIiifTile))
            continue
          }

          const scaledIiifPath = match[0]

          const filename = path.join(
            __dirname,
            'files',
            'iiif',
            'images',
            imageId,
            scaledIiifPath
          )

          console.log(`    Downloading ${fileCount} / ${fileCountTotal}`)

          await mkdirp(path.dirname(filename))

          const { body } = await fetch(imageUrl)

          if (body) {
            const stream = fs.createWriteStream(filename)
            await finished(Readable.fromWeb(body as any).pipe(stream))
            stream.end()
          }

          fileCount++
        }
      }
    } else {
      console.log(
        chalk.blue(`  Skipping scale factor ${tileZoomLevel.scaleFactor}`),
        `${tileZoomLevelIndex + 1} / ${parsedImage.tileZoomLevels.length}`
      )
    }
  }

  const newResourceId = `http://localhost/iiif/images/${imageId}`

  const newMap = {
    ...map,
    gcps: scaleGcps(map.gcps, minScaleFactor || 1),
    resourceMask: scaleResourceMask(map.resourceMask, minScaleFactor || 1),
    resource: {
      ...map.resource,
      id: newResourceId
    }
  }

  const newImageInfo = {
    '@context': 'http://iiif.io/api/image/2/context.json',
    '@id': newResourceId,
    protocol: 'http://iiif.io/api/image',
    tiles: (imageInfo as any)?.tiles.map(({ width, height, scaleFactors }) => {
      const maxScaleFactor = getMaxScaleFactorForTile(
        scaledImageWidth,
        scaledImageHeight,
        width,
        height
      )

      return {
        width,
        height,
        scaleFactors: scaleFactors.filter(
          (scaleFactor: number) => scaleFactor <= maxScaleFactor
        )
      }
    }),
    profile: ['http://iiif.io/api/image/2/level0.json'],
    width: scaledImageWidth,
    height: scaledImageHeight
  }

  fs.writeFileSync(
    imageInfoFilename,
    JSON.stringify(newImageInfo, null, 2),
    'utf-8'
  )

  await mkdirp(path.dirname(singleMapAnnotationFilename))

  const newAnnotation = {
    ...generateAnnotation(newMap),
    _arcade: {
      annotationUrl,
      mapId: map.id,
      imageId: parsedImage.uri,
      scale: minScaleFactor || 1
    }
  }

  fs.writeFileSync(
    singleMapAnnotationFilename,
    JSON.stringify(newAnnotation, null, 2),
    'utf-8'
  )
}

console.log(chalk.blue('Fetching tiles and annotations'))
console.log(new Date().toLocaleString())
console.log(
  chalk.blue('============================================================\n')
)

async function processAnnotationUrls(annotationUrls: string[]) {
  for (const annotationUrl of annotationUrls) {
    const annotationUrlHash = await generateId(annotationUrl)

    const annotationFilename = path.join(
      __dirname,
      'files',
      'annotations',
      `${annotationUrlHash}.json`
    )

    try {
      const annotation = await fetchJsonToFs(annotationUrl, annotationFilename)
      const maps = parseAnnotation(annotation)

      for (const map of maps) {
        try {
          await downloadTilesForMap(annotationUrl, map)
        } catch (err) {
          console.log(chalk.red('Error downloading tiles for map:'), err)
        }
      }
    } catch (err) {
      console.log(chalk.red('Error downloading annotation:'), err)
    }
  }
}

function removeOldAnnotations(annotationUrls: string[]) {
  const currentMapIds = annotationUrls
    .map((annotationUrl) => {
      const match = annotationUrl.match(/maps\/(?<mapId>\w*)$/)
      return match?.groups?.mapId
    })
    .filter(Boolean)

  const annotationsDir = path.join(__dirname, 'files', 'annotations')
  const existingAnnotations = fs
    .readdirSync(annotationsDir)
    .filter((file) => file.endsWith('.json'))

  for (const existingAnnotation of existingAnnotations) {
    const mapId = existingAnnotation.replace('.json', '')

    if (!currentMapIds.includes(mapId)) {
      console.log(
        chalk.red('Removing'),
        chalk.underline(existingAnnotation),
        'because it is no longer in the list of annotations'
      )

      fs.unlinkSync(path.join(annotationsDir, existingAnnotation))

      // TODO: also remove image, but only if they're not used by any other annotation
    }
  }
}

async function run(yamlConfigUrl: string) {
  const configuration = await getConfiguration(yamlConfigUrl)
  const annotationUrls = configuration.annotationUrls as string[]

  await processAnnotationUrls(annotationUrls)
  //   await removeOldAnnotations(annotationUrls)
}

try {
  await run(yamlConfigUrl)
} catch (err) {
  console.log(chalk.red('Error running script:'), err)
}
