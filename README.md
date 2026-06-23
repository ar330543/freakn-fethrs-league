# Freakn Fethrs Production V18.2

## Corrected team setup

Automatic generation now asks:

**How many players should be in each team?**

Allowed values are 2, 3, or 4. The app calculates the number of teams automatically.

Examples:

- 18 players and 2 players per team = 9 teams
- 18 players and 3 players per team = 6 teams

The total player count must divide evenly by the chosen team size.

## Match format

### 2 players per team

- Every team plays every other team once in a round robin.
- Each team matchup contains exactly 1 doubles game.
- The app no longer creates 3 duplicate games for a two-player team.

### 3 or 4 players per team

- The existing team-game logic is retained.
- Every team plays every other team.
- Each team matchup contains 3 doubles games using the team members.

## Other retained behavior

- Teammate-history avoidance still follows the full-league, last-two-weeks, then last-week fallback.
- Clicking Cancel does not generate or replace teams.
- Existing weeks and scores are untouched until the user explicitly generates a new schedule.
- No Supabase SQL update is required.

## Deployment verification

The live app must show:

`Build: V18.2 Team Size Format Fix`
