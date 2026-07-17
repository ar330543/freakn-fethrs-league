# Changelog

## 2026-07-17 — Inter-Club Match Format and Team Standings Cleanup

### 1. Inter-Club Match Format

- Each week can now be set to **Round Robin (Internal)** (the existing behavior) or
  **Inter-Club Match** — a new format for playing a visiting club instead of splitting our own
  group into internal teams. Picked from the Teams tab; locked once a week has any teams so the
  format can't be changed mid-setup.
- Inter-Club weeks get a **Visiting Club Roster**: enter the club's name and paste in that day's
  participating players, separate from our own Players tab.
- **Generate Courts** randomly pairs our available players and the visiting club's available
  players into doubles, one match per court, all running at the same time (multiple courts booked
  simultaneously is the normal case, not an edge case) — reuses the existing multi-set/"Delete
  This Set" mechanics from Round Robin weeks.
- Team Standings for an Inter-Club week becomes the Home vs. Club scoreboard automatically; Player
  Standings tags visiting-club players with the club name so they're easy to tell apart from our
  own roster.
- Inter-Club weeks are excluded from the cross-week Rankings, Overall Standings, and the
  teammate-repeat/skill-balancing history used by Round Robin's team generators, so a club match
  day never skews internal league stats.
- New columns: `format` and `club_name` on `weeks`, `is_opponent` on `players`. No new tables —
  reuses the existing teams/matches/match_games/game_scores structures.

### 2. Team Standings columns

- Replaced the `MW`/`GW` columns with `MP` (Matches Played) and `MW` (Matches Won).

## 2026-07-16 — Rankings, Roster, Multi-Set Weeks, and Player Dashboards

A major update covering four new features plus two bug fixes, developed and tested on a
separate staging environment before rolling out to production.

### 1. Player Rankings & Skill-Balanced Teams

- New **Rankings** tab: shows every player's current win/loss streak, games played, points
  for/against, and a **Rank Score** — a recency-weighted form metric where recent weeks count
  more than older ones (each week's net wins is weighted by how long ago it was, halving per
  week further back).
- New **Balanced Teams** mode alongside the existing Auto Generate and Handpick Teams options —
  builds teams so total Rank Score is spread evenly across teams, while still respecting the
  existing rule against repeating teammates from recent weeks (with the same relaxable fallback:
  whole league history → last 2 weeks → last week).
- No schema changes — computed entirely from existing match/score data.

### 2. Regular Players Roster

- New **Roster** tab: maintain a persistent list of regular players per league, so you don't have
  to retype the same names every week.
- **Players** tab now has a "Quick Add from Roster" section — tap any regular's name to add them
  to the current week instantly, or use "Add All" to add the whole roster at once. The original
  paste-a-list method still works for one-off guests.
- New table: `regular_players` (scoped per league).

### 3. Multi-Set Weeks

- You can now play a **second (or third) set of matches within the same week** instead of having
  to create a whole new week for it. Each team-generation mode (Auto, Balanced, Handpick) detects
  whether the current set has been scored yet:
  - **Not scored** → regenerating replaces that set (same "keep re-rolling until happy" behavior
    as before).
  - **Already scored** → a new set is created instead, and the previous set is left untouched.
- The "no repeat teammates" rule now also applies **within the same week** across sets, using the
  same relaxable fallback as the cross-week rule.
- Teams and Matches tabs now group everything by **Set 1 / Set 2 / …**, each with its own
  **Delete This Set** button for removing an unplayed or mis-generated set without affecting
  anything else.
- New columns: `set_number` on `teams` and `matches`.

### 4. Player Dashboard

- Click **any player's name**, anywhere it appears (Players, Roster, Teams, Matches, Team/Player
  Standings, Rankings) to open a dashboard showing:
  - Current rank and Rank Score
  - Win/loss streak
  - **Overall win %** across their whole history in the league
  - **Win % broken down by week**
  - Full **game history** — every game played, with teammate, opponents, score, and result

### Bug fixes

- **Score history orphaning**: deleting a week, league, or set previously left orphaned rows
  behind in `score_history` (it had no cascading link to the games it recorded), which could
  eventually confuse other features. Now cleaned up properly everywhere games are deleted.
- **Undo Last Score** previously picked the most recently edited score across the *entire
  database*, regardless of which week you were looking at. It's now correctly scoped to the
  currently selected week.

### Infrastructure

- Set up a full local development environment (Node, Supabase CLI, `.env` config) and a separate
  **staging deployment** (`freakn-fethrs-league-staging.vercel.app`, its own Supabase project) so
  new features could be built and tested against realistic data — including a full copy of real
  production league history — without touching the live app.
- Backed up production data and applied the same non-destructive schema migrations there before
  merging this work into `main`, keeping the production database and code in sync throughout.

### Database migrations (all additive, no data loss)

- `regular_players` table (roster feature)
- `set_number` columns on `teams` and `matches` (multi-set weeks)
- `undo_last_score()` rescoped to take a week ID parameter
