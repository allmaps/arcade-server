#!/usr/bin/env bash

echo -n "Waiting for $1"

until $(curl --output /dev/null --silent --head --fail $1); do
  printf '.'
  sleep 5
done

printf '\nReady!'
