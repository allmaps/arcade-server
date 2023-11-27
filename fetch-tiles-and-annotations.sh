#!/usr/bin/env bash

cd "$(dirname "$0")"

git pull

bun fetch-tiles-and-annotations.ts >> ./files/logs/fetch-tiles-and-annotations.log
