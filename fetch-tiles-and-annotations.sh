#!/usr/bin/env bash

cd "$(dirname "$0")"

echo "Stashing and pulling arcade-server"
git stash
git pull || echo "Failed to pull arcade-server"

echo "Installing arcade-server dependencies"
npm install

echo "Running fetch-tiles-and-annotations.ts"
bun fetch-tiles-and-annotations.ts
