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
import { Image } from '@allmaps/iiif-parser'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

import annotations from './annotations.json'

for (const annotationUrl of annotations) {
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
  const parsedImage = Image.parse(imageInfo)

  if (fs.existsSync(imageInfoFilename)) {
    console.log(
      chalk.green('Skipping'),
      chalk.underline(`${map.resource.id}/info.json`)
    )
  } else {
    console.log(
      chalk.blue('Downloading'),
      chalk.underline(`${map.resource.id}/info.json`),
      'to',
      chalk.green(imageId)
    )

    for (let [
      tileZoomLevelIndex,
      tileZoomLevel
    ] of parsedImage.tileZoomLevels.entries()) {
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

          const iiifPath = imageUrl.replace(map.resource.id, '')

          const filename = path.join(
            __dirname,
            'files',
            'iiif',
            'images',
            imageId,
            iiifPath
          )

          console.log(`    Downloading ${fileCount} / ${fileCountTotal}`)

          await mkdirp(path.dirname(filename))

          const stream = fs.createWriteStream(filename)
          const { body } = await fetch(imageUrl)
          if (body) {
            await finished(Readable.fromWeb(body).pipe(stream))
          }

          fileCount++
        }
      }
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
    tiles: imageInfo.tiles,
    profile: ['http://iiif.io/api/image/2/level0.json'],
    width: parsedImage.width,
    height: parsedImage.height
  }

  fs.writeFileSync(
    imageInfoFilename,
    JSON.stringify(newImageInfo, null, 2),
    'utf-8'
  )

  const annotationFilename = path.join(
    __dirname,
    'files',
    'annotations',
    `${imageId}.json`
  )

  await mkdirp(path.dirname(annotationFilename))

  fs.writeFileSync(
    annotationFilename,
    JSON.stringify(generateAnnotation(newMap), null, 2),
    'utf-8'
  )
}
