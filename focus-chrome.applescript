-- Run after launching Chrome in the logged-in cabinet user's GUI session.
-- Chrome exposes its windows directly; no simulated mouse click is needed.
set windowDeadline to (current date) + 60

with timeout of 5 seconds
  tell application "Google Chrome"
    repeat
      if running then
        if (count of windows) > 0 then exit repeat
      end if
      if (current date) >= windowDeadline then
        error "Timed out waiting for the Chrome kiosk window."
      end if
      delay 1
    end repeat

    -- Reassert focus during the fullscreen transition and late login activity.
    -- Stop after this short startup period so maintenance remains possible.
    repeat 5 times
      activate
      delay 2
    end repeat

    if not frontmost then
      error "Chrome did not remain frontmost after startup activation."
    end if
  end tell
end timeout
