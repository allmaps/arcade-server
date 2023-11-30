#!/usr/bin/env bash

cd "$(dirname "$0")"

cd ../arcade

git stash
git pull

pnpm install
pnpm run build

cp -r ./build/* ../arcade-server/files
