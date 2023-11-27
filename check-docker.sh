#!/usr/bin/env bash

rep=$(curl -s --unix-socket /var/run/docker.sock http://ping > /dev/null)
status=$?

if [ "$status" == "7" ]; then
    echo 'not connected'
    exit 1
fi

echo 'connected'
exit 0
