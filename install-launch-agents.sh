#!/usr/bin/env bash

sudo cp ./update-build-and-run.plist ~/Library/LaunchAgents/

sudo launchctl load ~/Library/LaunchAgents/update-build-and-run.plist
