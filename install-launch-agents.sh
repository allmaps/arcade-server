#!/usr/bin/env bash

cp ./update-build-and-run.plist ~/Library/LaunchAgents/

# TODO: use enable?
launchctl load -w ~/Library/LaunchAgents/update-build-and-run.plist
chmod 0600 ~/Library/LaunchAgents/update-build-and-run.plist
