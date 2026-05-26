# Freakn Fethrs Production V16 - No Repeat Teammates

Fixes:
- Random team generation now blocks any pair of players who were teammates in the immediately previous week.
- This is stronger than V15, which only blocked the exact full team from repeating.
- If you click Cancel on the team count prompt, no schedule is generated.
- Existing weeks, scores, standings, costs, and schedules are untouched.

Important:
- This applies only when generating new random teams.
- Existing generated schedules remain as-is.
- No SQL change needed.

Deploy:
1. Replace GitHub files with this ZIP contents.
2. Commit to GitHub.
3. Confirm live app shows: Build: V16 No Repeat Teammates.
