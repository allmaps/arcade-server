#!/usr/bin/env bash

cd "$(dirname "$0")"

./update-and-build.sh || echo "Failed to build arcade"

open -a Docker

while (! docker stats --no-stream ); do
  # Docker takes a few seconds to initialize
  echo "Waiting for Docker to launch..."
  sleep 1
done

docker-compose up --detach

while ! curl http://localhost/
do
  echo "Waiting for Caddy server to launch..."
  sleep 1
done

open -a "Google Chrome" --args --start-maximized \
  --start-fullscreen --kiosk --app=http://localhost/
