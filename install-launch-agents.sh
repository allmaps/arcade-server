#!/usr/bin/env bash

cp ./update-build-and-run.plist ~/Library/LaunchAgents/

launchctl load -w ~/Library/LaunchAgents/update-build-and-run.plist
