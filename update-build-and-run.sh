#!/usr/bin/env bash

cd "$(dirname "$0")"

echo "Updating and building Allmaps Arcade"

./update-and-build.sh || echo "Failed to build arcade"

echo "Starting Docker"

open -a Docker

while (! docker stats --no-stream ); do
  # Docker takes a few seconds to initialize
  echo "  Waiting for Docker to launch..."
  sleep 1
done

echo "Starting Caddy server"

docker-compose up --detach --remove-orphans

while ! curl http://localhost/
do
  echo "  Waiting for Caddy server to launch..."
  sleep 1
done

echo "Starting Google Chrome"

open -a "Google Chrome" --args --start-maximized \
  --start-fullscreen --kiosk --app=http://localhost/
