# Web server for Allmaps Arcade

Uses [Caddy](https://caddyserver.com/).

Uses [timeout](https://man7.org/linux/man-pages/man1/timeout.1.html) to check for internet connection. Install using brew on macOS as follows:

```bash
brew install coreutils
```

This should automatically create a symlink between `gtimeout` and `timeout` on macOS > 12.6.

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
