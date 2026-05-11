create extension if not exists pgcrypto;

create table if not exists league_state (
  slug text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table league_state enable row level security;

drop policy if exists "Public read league_state" on league_state;
drop policy if exists "Public write league_state" on league_state;

create policy "Public read league_state"
on league_state for select
using (true);

create policy "Public write league_state"
on league_state for all
using (true)
with check (true);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists league_state_updated_at on league_state;
create trigger league_state_updated_at
before update on league_state
for each row execute function set_updated_at();
