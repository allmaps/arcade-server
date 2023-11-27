#!/usr/bin/env bash

cd "$(dirname "$0")"

cd ../arcade
git pull

pnpm run build

cp -r ./build/* ../arcade-server/files
