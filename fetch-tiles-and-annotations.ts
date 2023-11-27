import url from 'url'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { finished } from 'stream/promises'
import { mkdirp } from 'mkdirp'
import chalk from 'chalk'

import { generateId } from '@allmaps/id'
import { parseAnnotation, generateAnnotation } from '@allmaps/annotation'
import { fetchJson, fetchImageInfo } from '@allmaps/stdlib'
import { Image, type ImageRequest } from '@allmaps/iiif-parser'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

import annotationUrls from './annotations.json'

const maxImageDimension = 16_384

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
    Math.ceil(
      Math.log2(Math.max(imageWidth / tileWidth, imageHeight / tileHeight))
    )
  )
}

async function downloadAnnotationAndTiles(
  annotationUrl: string,
  annotationFilename: string
) {
  const annotation = await fetchJson(annotationUrl)
  const maps = parseAnnotation(annotation)
  const map = maps[0]

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
    `(${map.resource.width}, ${map.resource.height})`,
    minScaleFactor
      ? chalk.green(
          `(${Math.round(map.resource.width / minScaleFactor)}, ${Math.round(
            map.resource.height / minScaleFactor
          )})`
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
        `${tileZoomLevelIndex + 1} / ${parsedImage.tileZoomLevels.length}`
      )
      let fileCount = 1
      let fileCountTotal = tileZoomLevel.columns * tileZoomLevel.rows
      for (const column of Array(tileZoomLevel.columns).fill(0).keys()) {
        for (const row of Array(tileZoomLevel.rows).fill(0).keys()) {
          const iiifTile = parsedImage.getIiifTile(tileZoomLevel, column, row)
          const imageUrl = parsedImage.getImageUrl(iiifTile)

          const scaledIiifTile = scaleTile(iiifTile, minScaleFactor || 1)
          const scaledIiifPath = parsedImage
            .getImageUrl(scaledIiifTile)
            .replace(map.resource.id, '')

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

          const stream = fs.createWriteStream(filename)
          const { body } = await fetch(imageUrl)
          if (body) {
            await finished(Readable.fromWeb(body as any).pipe(stream))
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
    resource: {
      ...map.resource,
      id: newResourceId
    }
  }

  const newImageInfo = {
    '@context': 'http://iiif.io/api/image/2/context.json',
    '@id': newResourceId,
    protocol: 'http://iiif.io/api/image',
    // max 8
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

  await mkdirp(path.dirname(annotationFilename))

  fs.writeFileSync(
    annotationFilename,
    JSON.stringify(generateAnnotation(newMap), null, 2),
    'utf-8'
  )
}

console.log(chalk.blue('Fetching tiles and annotations'))
console.log(new Date().toLocaleString())
console.log(
  chalk.blue('============================================================\n')
)

for (const annotationUrl of annotationUrls) {
  // Annotation URLs MUST be single map URLs, like this:
  // https://annotations.allmaps.org/maps/16d5862724595677
  //
  // This is to ensure that the map ID can be extracted from the URL
  // without having to download and parse the annotation first.
  const match = annotationUrl.match(/maps\/(?<mapId>\w*)$/)

  const mapId = match?.groups?.mapId

  if (!mapId) {
    console.log(
      chalk.red('Skipping, not a single map URL:'),
      chalk.underline(annotationUrl)
    )
    continue
  }

  const annotationFilename = path.join(
    __dirname,
    'files',
    'annotations',
    `${mapId}.json`
  )

  if (fs.existsSync(annotationFilename)) {
    console.log(
      chalk.green('Skipping, already exists:'),
      chalk.underline(annotationFilename)
    )
    continue
  }

  try {
    await downloadAnnotationAndTiles(annotationUrl, annotationFilename)
  } catch (err) {
    console.error(chalk.red('Error downloading annotation:'), err.message, err)
  }
}

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
