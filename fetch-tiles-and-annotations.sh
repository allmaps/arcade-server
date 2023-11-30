#!/usr/bin/env bash

cd "$(dirname "$0")"

echo "Stashing and pulling arcade-server"
git stash
git pull || echo "Failed to pull arcade-server"

echo "Installing arcade-server dependencies"
pnpm install

echo "Running fetch-tiles-and-annotations.ts"
bun fetch-tiles-and-annotations.ts >> ./files/logs/fetch-tiles-and-annotations.log
