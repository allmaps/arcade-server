#!/usr/bin/env bash

cd "$(dirname "$0")"

echo "Stashing and pulling arcade-server"
git stash
git pull || echo "Failed to pull arcade-server"

echo "Installing arcade-server dependencies"
npm install

while ! curl http://localhost/
do
  echo "  Waiting for Caddy server to launch..."
  sleep 20
done

while ! curl https://allmaps.org/
do
  echo "  Waiting for internet connection..."
  sleep 20
done

echo "Running fetch-tiles-and-annotations.ts"
bun fetch-tiles-and-annotations.ts
