# Freakn Fethrs Production V18.3 — Score Entry Tools

## New score-entry options

### Quick Entry by Teams

The Matches page now contains two team dropdowns:

- Team 1
- Team 2

After choosing the teams, the app finds their scheduled round-robin matchup and displays all individual games for score entry.

### Find Games by Player

The Matches page now includes a player-name search field. It displays every game involving that player in the selected week. Scores can be edited and cleared directly from those results.

## Synchronization

The dropdown view, player-search view and original full match schedule all edit the same `game_scores` records through the existing `update_score_with_history` function.

A score saved from any view appears in the other views automatically.

## Retained from V18.2

- Team setup asks for players per team
- Two-player teams get one doubles game per matchup
- Three- and four-player teams retain the three-game format
- Teammate-history fallback rules
- Cancel does not regenerate teams
- Weekly and overall standings
- Cost management
- Realtime score synchronization

## Database

No Supabase schema or SQL update is required.

## Deployment verification

The live app must display:

`Build: V18.3 Score Entry Tools`
