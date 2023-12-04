#!/usr/bin/env bash

cd "$(dirname "$0")"

cd ../arcade

echo "Stashing and pulling Allmaps Arcade"
git stash
git pull

echo "Installing Allmaps Arcade dependencies"
npm install

echo "Building Allmaps Arcade"
npm run build

echo "Copying build to arcade-server"
cp -r ./build/* ../arcade-server/files
