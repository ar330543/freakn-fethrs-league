# Freakn Fethrs Production V18.4 — Smart Default + Responsive UI

## Fix 1: smarter default load

When the app opens, it now defaults to the league and week with the most recent activity.

The app checks activity from:

- week creation
- players added
- teams generated
- matches created
- scores updated
- weekly costs updated

No database migration is required. This is calculated from existing Supabase data.

## Fix 2: phone-friendly responsive UI

The mobile browser layout has been polished:

- compact sticky top area
- horizontally scrollable navigation pills
- better header spacing
- league/week selectors stack neatly
- score-entry rows are easier to read on small screens
- Save/Clear buttons align cleanly
- team-vs-team cards stack cleanly
- tables scroll horizontally instead of scrambling
- desktop and iPad layouts are preserved

## Retained from V18.3

- team-vs-team dropdown score entry
- player search score entry
- original full schedule score entry
- team-size-based schedule generation
- teammate-history rules
- weekly and overall standings
- cost management
- live score sync

## Database

No Supabase SQL update is required.

## Deployment verification

The live app must display:

`Build: V18.4 Smart Default + Responsive UI`
