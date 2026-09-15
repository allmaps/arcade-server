# Web server for Allmaps Arcade

Uses [Caddy](https://caddyserver.com/).

Uses [timeout](https://man7.org/linux/man-pages/man1/timeout.1.html) to check for internet connection. Install using brew on macOS as follows:

```bash
brew install coreutils
```

This should automatically create a symlink between `gtimeout` and `timeout` on macOS > 12.6.

## Create offline cache for IIIF images

List of Georeference Annotations:

- Read each info.json
- Copy every tile

## Start caddy

```bash
docker-compose up
```

Example URLs:

- http://localhost/tiles/protomaps-basemap-opensource-20230408/13/4303/2690.mvt

## Cabinet browser focus on macOS

`update-build-and-run.sh` starts Docker in the background, launches Chrome in
kiosk mode, then runs `focus-chrome.applescript`. The helper waits up to 60 seconds
for a Chrome window (with a 5-second timeout per Apple event), then activates
Chrome repeatedly over 10 seconds to handle fullscreen and login startup races.
It reports an error if no window appears or Chrome is not frontmost at the end.
It does not keep reclaiming focus during normal use.

This belongs in the macOS launcher: the game's cabinet buttons already listen
for document keyboard events, but a web page cannot reliably bring a background
macOS application to the foreground. `ARCADE_CABINET=true` does not change that.

Run the launcher as the cabinet user's LaunchAgent after graphical login, as in
the supplied plist. On the Mac Mini, allow macOS Automation access to Google
Chrome if prompted; window inspection uses Apple events. No Accessibility or
"Allow JavaScript from Apple Events" permission is required by this helper.
If automation is denied, check System Settings > Privacy & Security > Automation
and the LaunchAgent's `files/logs/update-build-and-run.error.log`.

After copying/pulling these changes onto the Mac Mini, reboot and try the cabinet
buttons without clicking the window. Repeat a few cold starts to check the race.
The existing LaunchAgent calls the script in place, so no plist reinstall is
needed. To try activation alone with Chrome already open:

```bash
osascript ./focus-chrome.applescript
```

If buttons still fail while Chrome is frontmost, check page focus separately in
Chrome DevTools using `document.hasFocus()` (with DevTools detached and the game
window selected). That would indicate a different issue inside the browser.
