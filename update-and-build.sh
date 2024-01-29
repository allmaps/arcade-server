#!/usr/bin/env bash

cd "$(dirname "$0")"

cd ../arcade

echo "Stashing and pulling Allmaps Arcade"
git stash
git pull

echo "Installing Allmaps Arcade dependencies"
pnpm install

echo "Building Allmaps Arcade"
pnpm run build

echo "Copying build to arcade-server"
cp -r ./build/* ../arcade-server/files
