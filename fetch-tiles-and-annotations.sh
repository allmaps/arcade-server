#!/usr/bin/env bash

cd "$(dirname "$0")"

git pull || echo "Failed to pull arcade-server"

pnpm install

bun fetch-tiles-and-annotations.ts >> ./files/logs/fetch-tiles-and-annotations.log
