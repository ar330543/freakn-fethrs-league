create extension if not exists pgcrypto;
create table if not exists weeks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);
alter table weeks enable row level security;
drop policy if exists "Public access to weeks" on weeks;
create policy "Public access to weeks" on weeks for all using (true) with check (true);
