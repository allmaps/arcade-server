#!/usr/bin/env bash

cd "$(dirname "$0")"

git pull || echo "Failed to pull arcade-server"

bun fetch-tiles-and-annotations.ts >> ./files/logs/fetch-tiles-and-annotations.log
