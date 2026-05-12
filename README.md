# Freakn Fethrs Production V5

Fixes:
- Deleting a week no longer leaves the app on a deleted/blank week.
- Deleting a week deletes only that week's data, then auto-selects another week in the same league.
- Prevents deleting the only week in a league.
- Prevents deleting the only league.
- Adding players now shows a clear error if no week is selected.
- Week-scoped data is cleared only when no valid week exists, avoiding the "all players disappeared" confusion.

Deploy:
1. Replace GitHub repo files with this ZIP.
2. No SQL rerun needed if you already ran the normalized schema.
3. Commit to GitHub.
4. Vercel auto-deploys.
