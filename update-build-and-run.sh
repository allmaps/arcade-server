#!/usr/bin/env bash

cd "$(dirname "$0")"

./update-and-build.sh || echo "Failed to build arcade"

open -a Docker

sleep 10

docker-compose up --detach

sleep 10

open -a "Google Chrome" --args --start-maximized \
  --start-fullscreen --kiosk --app=http://localhost/
