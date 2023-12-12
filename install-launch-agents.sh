#!/usr/bin/env bash

# TODO: use enable instead of load?

cp ./update-build-and-run.plist ~/Library/LaunchAgents/
chmod 0600 ~/Library/LaunchAgents/update-build-and-run.plist

launchctl load -w ~/Library/LaunchAgents/update-build-and-run.plist

cp ./fetch-tiles-and-annotations.plist ~/Library/LaunchAgents/
chmod 0600 ~/Library/LaunchAgents/fetch-tiles-and-annotations.plist

launchctl load -w fetch-tiles-and-annotations
