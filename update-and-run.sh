#!/usr/bin/env bash

cd ../arcade
git pull

pnpm run build

cp -r ./dist/* ../arcade-server/files

docker-compose up

"/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome" --kiosk
--app=http://localhost/
