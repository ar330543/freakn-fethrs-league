# Freakn Fethrs Production V17 - Smart Team History Rules

Adds your preferred random team generation hierarchy:

1. First preference:
   - In that league, no one should be grouped with the same individual again.

2. If impossible:
   - Avoid repeats from the last 2 weeks.

3. Last resort:
   - Avoid repeats from the immediately previous week, so no one plays with the same person for 2 consecutive weeks.

Other fix retained:
- Clicking Cancel on the random team prompt does not generate teams.

Important:
- This applies only to newly generated random teams.
- Existing weeks, scores, teams, schedules, costs, and standings are untouched.
- No SQL change needed.

Deploy:
1. Replace GitHub files with this ZIP contents.
2. Commit to GitHub.
3. Confirm live app shows: Build: V17 Smart Team History Rules.
