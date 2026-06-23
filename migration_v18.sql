-- ============================================================
-- V18 Migration: Rotating Partners Mode
-- Run this in Supabase SQL Editor AFTER the existing schema.sql
-- Safe to re-run (all statements are idempotent)
-- ============================================================

-- 1. Add players_per_team setting to leagues (default 2 = doubles)
alter table leagues add column if not exists players_per_team int not null default 2;

-- 2. Permanent pair history table – tracks every unique pair that has
--    played together across ALL weeks in a league.
create table if not exists pair_history (
  id          uuid primary key default gen_random_uuid(),
  league_id   uuid references leagues(id) on delete cascade not null,
  player_a    text not null,   -- stored as player name (stable across weeks)
  player_b    text not null,   -- always player_a < player_b lexicographically
  week_id     uuid references weeks(id) on delete set null,
  created_at  timestamptz default now(),
  unique(league_id, player_a, player_b)
);

alter table pair_history enable row level security;
drop policy if exists "public all pair_history" on pair_history;
create policy "public all pair_history" on pair_history for all using (true) with check (true);

do $$ begin alter publication supabase_realtime add table pair_history; exception when duplicate_object then null; end $$;

-- 3. Add players_per_team index for fast lookups
create index if not exists pair_history_league_idx on pair_history(league_id);

-- ============================================================
-- Done. No existing data is modified.
-- ============================================================
