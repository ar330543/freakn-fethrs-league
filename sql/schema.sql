create extension if not exists pgcrypto;

create table if not exists leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists weeks (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  week_id uuid references weeks(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now(),
  unique(week_id, name)
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  week_id uuid references weeks(id) on delete cascade not null,
  name text not null,
  emoji text default '🔥',
  color text default '#ff3b00',
  created_at timestamptz default now()
);

create table if not exists team_players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade not null,
  unique(team_id, player_id)
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  week_id uuid references weeks(id) on delete cascade not null,
  slot int not null,
  court text not null,
  team1_id uuid references teams(id) on delete cascade not null,
  team2_id uuid references teams(id) on delete cascade not null,
  created_at timestamptz default now()
);

create table if not exists match_games (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade not null,
  game_number int not null,
  t1_player1_id uuid references players(id) on delete cascade not null,
  t1_player2_id uuid references players(id) on delete cascade not null,
  t2_player1_id uuid references players(id) on delete cascade not null,
  t2_player2_id uuid references players(id) on delete cascade not null,
  unique(match_id, game_number)
);

create table if not exists game_scores (
  game_id uuid primary key references match_games(id) on delete cascade,
  score1 int,
  score2 int,
  updated_at timestamptz default now()
);

create table if not exists score_history (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null,
  old_score1 int,
  old_score2 int,
  new_score1 int,
  new_score2 int,
  created_at timestamptz default now()
);

alter table leagues enable row level security;
alter table weeks enable row level security;
alter table players enable row level security;
alter table teams enable row level security;
alter table team_players enable row level security;
alter table matches enable row level security;
alter table match_games enable row level security;
alter table game_scores enable row level security;
alter table score_history enable row level security;

drop policy if exists "public all leagues" on leagues;
create policy "public all leagues" on leagues for all using (true) with check (true);
drop policy if exists "public all weeks" on weeks;
create policy "public all weeks" on weeks for all using (true) with check (true);
drop policy if exists "public all players" on players;
create policy "public all players" on players for all using (true) with check (true);
drop policy if exists "public all teams" on teams;
create policy "public all teams" on teams for all using (true) with check (true);
drop policy if exists "public all team_players" on team_players;
create policy "public all team_players" on team_players for all using (true) with check (true);
drop policy if exists "public all matches" on matches;
create policy "public all matches" on matches for all using (true) with check (true);
drop policy if exists "public all match_games" on match_games;
create policy "public all match_games" on match_games for all using (true) with check (true);
drop policy if exists "public all game_scores" on game_scores;
create policy "public all game_scores" on game_scores for all using (true) with check (true);
drop policy if exists "public all score_history" on score_history;
create policy "public all score_history" on score_history for all using (true) with check (true);

create or replace function update_score_with_history(p_game_id uuid, p_score1 int, p_score2 int)
returns void as $$
declare oldrow game_scores%rowtype;
begin
  select * into oldrow from game_scores where game_id = p_game_id;

  insert into score_history(game_id, old_score1, old_score2, new_score1, new_score2)
  values (p_game_id, oldrow.score1, oldrow.score2, p_score1, p_score2);

  insert into game_scores(game_id, score1, score2, updated_at)
  values (p_game_id, p_score1, p_score2, now())
  on conflict(game_id) do update
  set score1 = excluded.score1,
      score2 = excluded.score2,
      updated_at = now();
end;
$$ language plpgsql security definer;

create or replace function undo_last_score()
returns void as $$
declare h score_history%rowtype;
begin
  select * into h from score_history order by created_at desc limit 1;
  if h.id is null then return; end if;

  insert into game_scores(game_id, score1, score2, updated_at)
  values (h.game_id, h.old_score1, h.old_score2, now())
  on conflict(game_id) do update
  set score1 = h.old_score1,
      score2 = h.old_score2,
      updated_at = now();

  delete from score_history where id = h.id;
end;
$$ language plpgsql security definer;

do $$ begin alter publication supabase_realtime add table leagues; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table weeks; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table players; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table teams; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table team_players; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table matches; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table match_games; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table game_scores; exception when duplicate_object then null; end $$;



-- V9 non-destructive overall leaderboard feature
create table if not exists overall_leaderboards (
  league_id uuid primary key references leagues(id) on delete cascade,
  data jsonb not null default '[]'::jsonb,
  calculated_at timestamptz default now()
);

create table if not exists overall_leaderboard_history (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade not null,
  data jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table overall_leaderboards enable row level security;
alter table overall_leaderboard_history enable row level security;

drop policy if exists "public all overall_leaderboards" on overall_leaderboards;
create policy "public all overall_leaderboards" on overall_leaderboards for all using (true) with check (true);

drop policy if exists "public all overall_leaderboard_history" on overall_leaderboard_history;
create policy "public all overall_leaderboard_history" on overall_leaderboard_history for all using (true) with check (true);

do $$ begin alter publication supabase_realtime add table overall_leaderboards; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table overall_leaderboard_history; exception when duplicate_object then null; end $$;



-- V12 non-destructive weekly cost management
create table if not exists week_costs (
  week_id uuid primary key references weeks(id) on delete cascade,
  cost_per_birdie numeric default 0,
  birdie_count numeric default 0,
  court_booking_cost numeric default 0,
  player_count_override int,
  updated_at timestamptz default now()
);

alter table week_costs enable row level security;

drop policy if exists "public all week_costs" on week_costs;
create policy "public all week_costs" on week_costs for all using (true) with check (true);

do $$ begin alter publication supabase_realtime add table week_costs; exception when duplicate_object then null; end $$;



-- V19 non-destructive regular players roster
create table if not exists regular_players (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now(),
  unique(league_id, name)
);

alter table regular_players enable row level security;

drop policy if exists "public all regular_players" on regular_players;
create policy "public all regular_players" on regular_players for all using (true) with check (true);

do $$ begin alter publication supabase_realtime add table regular_players; exception when duplicate_object then null; end $$;



-- V20 non-destructive multi-set weeks
alter table teams add column if not exists set_number int not null default 1;
alter table matches add column if not exists set_number int not null default 1;



-- V21 scope undo_last_score to a single week (previously unscoped across the whole database)
drop function if exists undo_last_score();
create or replace function undo_last_score(p_week_id uuid)
returns void as $$
declare h score_history%rowtype;
begin
  select sh.* into h
  from score_history sh
  join match_games mg on mg.id = sh.game_id
  join matches m on m.id = mg.match_id
  where m.week_id = p_week_id
  order by sh.created_at desc
  limit 1;

  if h.id is null then return; end if;

  insert into game_scores(game_id, score1, score2, updated_at)
  values (h.game_id, h.old_score1, h.old_score2, now())
  on conflict(game_id) do update
  set score1 = h.old_score1, score2 = h.old_score2, updated_at = now();

  delete from score_history where id = h.id;
end;
$$ language plpgsql security definer;
