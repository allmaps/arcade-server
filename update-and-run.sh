#!/usr/bin/env bash

cd ~/projects/arcade
git pull

pnpm run build




# allmaps-arcade.local

"/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome" --kiosk
--app=http://allmaps-arcade/
