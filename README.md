# Freakn Fethrs Production V18.1

V18.1 is a consolidated release containing the complete feature set through V17, with the teammate-history logic corrected and strengthened.

## Critical V18.1 fix

Players are stored as separate database rows in every week. Earlier releases compared the weekly player IDs, which change from week to week. V18.1 compares normalized player names instead, so Arjun in Week 1 and Arjun in Week 2 are correctly treated as the same person.

Random team creation now follows this hierarchy:

1. Avoid every teammate pairing that has already occurred anywhere in the selected league.
2. If that is impossible, avoid teammate pairings from the last 2 weeks.
3. As the final fallback, avoid teammate pairings from the immediately previous week.

The generator uses constraint-aware backtracking rather than relying only on repeated random shuffles.

## Included features

- Multiple leagues
- Multiple weeks per league
- Latest week opens by default
- Weekly standings and overall league standings
- Weekly cost management
- Live score synchronization
- Score history and undo
- Automatic and handpicked teams
- Fixed round-robin slots
- Randomized game pairing order
- Team member names below team labels
- Validation for unrealistic configurations
- Safe Cancel behavior during random generation

## Database and existing data

- No SQL change is required when upgrading from V17.
- Existing leagues, weeks, teams, scores, standings, costs and historical data are not deleted.
- Existing schedules remain unchanged unless you explicitly regenerate them.

## Deployment verification

After deploying, confirm all three:

- `package.json` version is `18.1.0`
- `release.json` says `V18.1`
- The live app displays `Build: V18.1 Consolidated Stable Release`
