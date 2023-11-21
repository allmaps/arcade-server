# Web server for Allmaps Arcade

Uses [Caddy](https://caddyserver.com/).

## Create offline cache for IIIF images

List of Georeference Annotations:

- Read each info.json
- Copy every tile

## Start caddy

```bash
docker-compose up
```

Example URLs:

- http://localhost/tiles/protomaps-basemap-opensource-20230408/13/4303/2690.mvt
