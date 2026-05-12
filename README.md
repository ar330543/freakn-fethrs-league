# Freakn Fethrs Production V6

Fixes:
- Score inputs now accept typing normally.
- Score fields use text + numeric keyboard instead of number inputs to avoid controlled-input/browser issues.
- Scores are held locally as strings while typing and saved only when Save is clicked.
- Existing saved DB scores continue to populate across browsers/devices.
- Keeps V5 week deletion protections.

Deploy:
1. Replace GitHub repo files with this ZIP.
2. No SQL rerun needed if normalized schema is already deployed.
3. Commit to GitHub.
4. Vercel auto-deploys.
