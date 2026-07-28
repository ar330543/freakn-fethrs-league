# Changelog

## 2026-07-28 — Inter-Club League Format (replaces the simple Inter-Club Match format)

### 1. Inter-Club League

- A week's format is now picked from the **Players** tab (moved from Teams), before any players
  or teams are added: **Round Robin (Internal)**, or the new **Inter-Club League**. The old
  **Inter-Club Match** picker button is gone, but weeks that already used it keep working exactly
  as before — nothing about that format's data or rendering changed.
- Inter-Club League weeks ask for **two club names** and a full roster for each — unlike the old
  Inter-Club Match format, neither club defaults to our own regular players.
- **Teams** tab: each club's players are manually assigned into teams independently, from a
  dropdown scoped to that club's roster.
- **Matches** tab gets a **Generate League Schedule** button once both clubs have teams: every
  team in Club A plays every team in Club B exactly once (a complete bipartite round robin, not
  the internal circle-method round robin used by Round Robin weeks), spread across rounds so no
  team plays twice in the same round.
- **Combined Leaderboard**: the existing Team Standings screen, relabeled, showing both clubs'
  teams together — same computation, just scoped to the league stage once knockouts start.
- **Knockouts**: after every league game is scored, choose whether to run knockouts. If yes, pick
  how many teams qualify (any even number), and the app seeds Rank 1 vs. last, Rank 2 vs.
  2nd-last, and so on from the Combined Leaderboard — every seeded matchup can be overridden from
  a dropdown of all teams before confirming.
- **Knockout Standings**: a new section (and standings tab) showing just the winners of each
  knockout matchup, in seed order — everything downstream ranks off this, not the league table.
- Choose **Semifinal** or **Playoffs** format off the top 4 of Knockout Standings:
  - Semifinal: Rank 1 vs. 4, Rank 2 vs. 3, then a **Grand Final** (semifinal winners) and a
    **Bronze Medal Match** (semifinal losers) — both playable, both overridable from a dropdown of
    every team that reached the Semifinals.
  - Playoffs: Qualifier 1 (Rank 1 vs. 2), Eliminator (Rank 3 vs. 4), Qualifier 2 (Qualifier 1's
    loser vs. Eliminator's winner), then a **Grand Final** (Qualifier 1 and Qualifier 2 winners).
    The Bronze medalist is whoever loses Qualifier 2 — not a scheduled match, just a computed
    result.
- Every stage that's auto-seeded from a ranking has a manual override dropdown, scoped to that
  stage's actual pool of eligible teams (e.g. Semifinal overrides only offer teams that played
  knockouts; Grand Final overrides only offer teams that played the prior round).
- Inter-Club League weeks are excluded from the cross-week Rankings, Overall Standings, and
  teammate-repeat/skill-balancing history, same principle as Inter-Club Match weeks already were.
- New `clubs` table; new `club_id` column on `players` and `teams`; new `stage`, `bracket_order`,
  and `label` columns on `matches`; new `knockouts_choice`, `knockout_qualifier_count`, and
  `bracket_format` columns on `weeks`. Fully additive — no existing data is touched.

## 2026-07-17 — Inter-Club Match Format, Fun Stats, and Cross-League Standings

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

### 3. Manual court assignment for Inter-Club

- The Teams tab for an Inter-Club week now has an **Auto Generate** / **Manual Setup** mode
  picker, mirroring Round Robin's mode picker.
- **Manual Setup** lets you add a row per court ("+ Add Court") and pick exactly who plays each
  match from dropdowns (2 of our players, 2 of the club's). A player already assigned to one
  court is automatically excluded from the other courts' dropdowns in that set, so you can't
  accidentally double-book someone.
- **Auto Generate** keeps the original random-pairing behavior from earlier in the day, now
  presented as one of two explicit choices instead of the only option.

### 4. New-week guidance

- Creating a week (from the header "+ Week" button or Settings) now redirects you straight to
  the Teams tab, where format/team setup happens — previously it left you on whatever tab you
  started from.
- A new **"+ Set" button** next to "+ Week" in the header (visible on every tab) jumps to the
  Teams tab too, so starting the next set doesn't require navigating there manually first.
- Whenever the selected week has no players yet, a banner appears on every tab reminding you to
  add players, with a one-click **"Copy Players from '{week}'"** button that finds the most
  recent *other* week in the league that actually has a roster (skipping empty ones) and copies
  it over.

### 5. Fun Stats tab

- New **Fun Stats** nav tab with interesting records computed live from each league's Round
  Robin history: **Hot Streak** (current win streaks), **All-Time Best Streak** (longest win
  streak ever recorded), **Dream Team** (best teammate duo by win %, minimum 3 games together),
  **Most Improved** (biggest win % jump between a player's last two played weeks), **Iron
  Player** (most games played), **Most Loyal** (most distinct weeks attended), **Biggest
  Blowout**, and **Nail-Biter** (largest/smallest margin games).
- No schema changes — reuses the same raw match/score data as Rankings, and (like Rankings)
  excludes Inter-Club weeks.

### 6. Cross-league Overall Standings

- Overall Standings now has **This League** / **All Leagues** sub-tabs. "This League" is the
  existing persisted calculate/undo/clear flow, unchanged. "All Leagues" is a new live view that
  aggregates completed games across **every league** in the app, not just the selected one — no
  separate calculate step, just refreshes when you open it (or via its own Refresh button).

### 7. Shipped to production

- All of the above (plus the 2026-07-16 work) was merged from `feature_Sashank` into `main` and
  deployed. The `format`/`club_name`/`is_opponent` schema migration was applied directly to the
  production Supabase project (verified all 4 leagues / 12 weeks / 140 players were left intact)
  ahead of the frontend deploy.

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
