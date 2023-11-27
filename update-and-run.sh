#!/usr/bin/env bash

cd "$(dirname "$0")"

./build.sh || echo "Failed to build arcade"

open -a Docker

docker-compose up

"/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome" \
  --kiosk --app=http://localhost/
