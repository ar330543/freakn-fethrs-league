# Freakn Fethrs League — V18 Rotating Partners Mode

## What's new in V18

### 🏸 Rotating Partners Mode
- **Players-per-team selector** — Switch between Singles (1), Doubles (2), 3-player, or 4-player team mode per league.
- **Permanent partner uniqueness** — Auto-generate never repeats a partner pair that has appeared anywhere in the league's history.
- **`pair_history` table** — Every time teams are generated, used partner combos are written to Supabase. They persist forever (across sessions, weeks, and users).
- **Exhaustion detection** — Live percentage meter shows how many unique combinations remain. Warning banner appears at 80%+. At 100%, you're prompted before generating with repeated partners.
- **Partner History tab** — Browse every pair ever used. Shows which week it was used in. Clear the history to start fresh.
- **Exhaustion-aware fallback** — If unique partnerships run out, the app warns you and lets you proceed (repeating is ok) rather than crashing.

### 📊 Existing features preserved
- Weekly team & player standings
- Overall league standings with undo/history
- Cost management (birdies, court, per-person)
- Match results & score entry with undo
- Multiple leagues
- Manual team assignment
- Real-time sync via Supabase

---

## Deploy Steps

### 1 — SQL Migration (run once in Supabase SQL Editor)

```sql
-- Run sql/schema.sql if this is a fresh Supabase project
-- Then run sql/migration_v18.sql for existing projects
```

`migration_v18.sql` adds:
- `players_per_team` column on `leagues` (default: 2)
- `pair_history` table with league_id, player_a, player_b, week_id
- RLS policies and realtime publication

**This migration is fully non-destructive. All existing data is untouched.**

### 2 — Replace GitHub files

Replace the contents of your repo with this folder's files. The structure is:

```
freakn-fethrs-v18/
├── index.html
├── package.json
├── vite.config.js
├── sql/
│   ├── schema.sql          ← full schema (fresh installs)
│   └── migration_v18.sql   ← incremental migration (existing installs)
└── src/
    ├── main.jsx
    ├── index.css
    └── App.jsx             ← all new logic lives here
```

### 3 — Commit & push

```bash
git add -A
git commit -m "V18 Rotating Partners Mode"
git push
```

Vercel will auto-deploy. Confirm the build marker shows: **V18 Rotating Partners Mode**

---

## How Partner Uniqueness Works

1. When `Generate Random Teams` is clicked, the app loads all `pair_history` rows for the current league.
2. It tries up to 20,000 random arrangements to find one where no within-team pair has been used before.
3. If found, teams are saved and the new pairs are written to `pair_history`.
4. If no unique arrangement exists, you get a warning and can choose to proceed with repeats anyway.

**Manual teams** also write to `pair_history`, so uniqueness is tracked regardless of how teams were created.

---

## Exhaustion Stats

The Dashboard and sidebar show:
- **Partner Combos Used**: `X / Y (Z%)` where Y = total possible unique pairings from the current player roster.

For 12 players in doubles mode, Y = C(12,2) = 66 possible unique pairs.

---

## Build marker
`V18 Rotating Partners Mode`
