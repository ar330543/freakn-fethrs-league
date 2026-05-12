
# Freakn Fethrs Production V4

Fixes:
- Scores now show correctly when opening from a new browser/device.
- Local blank draft values no longer override database scores.
- Realtime score updates remain visible unless the user is actively editing that exact game.
- Save/Clear removes local stale draft state after database update.
- Reset Match Scores uses the same score-update flow for better realtime consistency.

Deploy:
1. Replace GitHub repo files with this ZIP.
2. No SQL rerun needed if you already ran the normalized schema.
3. Commit to GitHub.
4. Vercel auto-deploys.
