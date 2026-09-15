#!/usr/bin/env bash

cd "$(dirname "$0")"

echo "Starting Docker"

open -g -a Docker

while (! ./check-docker.sh ); do
  # Docker takes a few seconds to initialize
  echo "  Waiting for Docker to launch..."
  sleep 1
done

echo "Starting Caddy server"

docker-compose up --detach --remove-orphans

# Wait for Caddy server to launch
./wait-for-website.sh "http://localhost/"

# Wait for internet connection
./wait-for-website.sh "https://allmaps.org/"

echo "Updating and building Allmaps Arcade"

./update-and-build.sh || echo "Failed to build arcade"

echo "Starting Google Chrome"

# In case windows were accidentally restored
killall "Google Chrome"

while killall -0 "Google Chrome"; do 
    sleep 1
done

open -a "Google Chrome" --args --start-maximized \
  --start-fullscreen --kiosk --app=http://localhost/ || exit 1

# open returns before Chrome has created its kiosk window.
echo "Waiting for and focusing Google Chrome"
osascript ./focus-chrome.applescript || {
  echo "Failed to focus Google Chrome; see the startup error log." >&2
  exit 1
}
