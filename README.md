# Freakn Fethrs Production V15 - Avoid Last Week Teams

Adds:
- Random team generation checks the immediately previous week in the same league.
- It avoids generating any team with the exact same full set of players as last week.
- If it cannot find a fully different combination after 500 attempts, it shows an error and asks you to change team/player count or use Handpick Teams.

Important:
- This affects newly generated random teams only.
- Existing weeks, schedules, scores, standings, and costs are untouched.
- No SQL change needed.

Deploy:
1. Replace GitHub files with this ZIP contents.
2. Commit to GitHub.
3. Confirm live app shows: Build: V15 Avoid Last Week Teams.
