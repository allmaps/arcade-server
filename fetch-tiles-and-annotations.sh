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
  sleep 1
done

export ARCADE_YAML_CONFIG_URL=http://localhost/annotations/maps

echo "Running fetch-tiles-and-annotations.ts"
bun fetch-tiles-and-annotations.ts
