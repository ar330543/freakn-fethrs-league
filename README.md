# Freakn Fethrs Production V8

This is a clean, readable rebuild of the current app code.

Fixes:
- Score input accepts typing normally.
- Score values are local while typing and saved only on Save.
- Visible build marker: `Build: V8 Clean Score Input Fix`.
- Week deletion is protected.
- Multiple leagues/weeks, auto teams, manual teams, standings, and realtime sync are retained.

Deploy:
1. Replace all files in GitHub with this ZIP contents at the repo root.
2. Commit to GitHub.
3. Vercel auto-deploys.
4. Confirm the live site shows `Build: V8 Clean Score Input Fix`.

SQL:
- No SQL rerun needed if the normalized schema already exists.
- If needed, run `sql/schema.sql`.
