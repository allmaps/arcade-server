#!/usr/bin/env bash

cd "$(dirname "$0")"

# Wait for internet connection
./wait-for-website.sh "https://allmaps.org/"

echo "Stashing and pulling arcade-server"
git stash
git pull || echo "Failed to pull arcade-server"

echo "Installing arcade-server dependencies"
pnpm install

# Wait for Caddy server to launch
./wait-for-website.sh "http://localhost/"

echo "Running fetch-tiles-and-annotations.ts"
bun fetch-tiles-and-annotations.ts
