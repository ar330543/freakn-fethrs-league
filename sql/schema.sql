create extension if not exists pgcrypto;

drop table if exists score_history cascade;
drop table if exists game_scores cascade;
drop table if exists match_games cascade;
drop table if exists matches cascade;
drop table if exists team_players cascade;
drop table if exists teams cascade;
drop table if exists players cascade;
drop table if exists weeks cascade;
drop table if exists leagues cascade;

create table leagues (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz default now());
create table weeks (id uuid primary key default gen_random_uuid(), league_id uuid references leagues(id) on delete cascade not null, name text not null, created_at timestamptz default now());
create table players (id uuid primary key default gen_random_uuid(), week_id uuid references weeks(id) on delete cascade not null, name text not null, created_at timestamptz default now(), unique(week_id,name));
create table teams (id uuid primary key default gen_random_uuid(), week_id uuid references weeks(id) on delete cascade not null, name text not null, emoji text default '🔥', color text default '#ff3b00', created_at timestamptz default now());
create table team_players (id uuid primary key default gen_random_uuid(), team_id uuid references teams(id) on delete cascade not null, player_id uuid references players(id) on delete cascade not null, unique(team_id,player_id));
create table matches (id uuid primary key default gen_random_uuid(), week_id uuid references weeks(id) on delete cascade not null, slot int not null, court text not null, team1_id uuid references teams(id) on delete cascade not null, team2_id uuid references teams(id) on delete cascade not null, created_at timestamptz default now());
create table match_games (id uuid primary key default gen_random_uuid(), match_id uuid references matches(id) on delete cascade not null, game_number int not null, t1_player1_id uuid references players(id) on delete cascade not null, t1_player2_id uuid references players(id) on delete cascade not null, t2_player1_id uuid references players(id) on delete cascade not null, t2_player2_id uuid references players(id) on delete cascade not null, unique(match_id,game_number));
create table game_scores (game_id uuid primary key references match_games(id) on delete cascade, score1 int, score2 int, updated_at timestamptz default now());
create table score_history (id uuid primary key default gen_random_uuid(), game_id uuid not null, old_score1 int, old_score2 int, new_score1 int, new_score2 int, created_at timestamptz default now());

alter table leagues enable row level security; alter table weeks enable row level security; alter table players enable row level security; alter table teams enable row level security; alter table team_players enable row level security; alter table matches enable row level security; alter table match_games enable row level security; alter table game_scores enable row level security; alter table score_history enable row level security;
create policy "public all leagues" on leagues for all using (true) with check (true);
create policy "public all weeks" on weeks for all using (true) with check (true);
create policy "public all players" on players for all using (true) with check (true);
create policy "public all teams" on teams for all using (true) with check (true);
create policy "public all team_players" on team_players for all using (true) with check (true);
create policy "public all matches" on matches for all using (true) with check (true);
create policy "public all match_games" on match_games for all using (true) with check (true);
create policy "public all game_scores" on game_scores for all using (true) with check (true);
create policy "public all score_history" on score_history for all using (true) with check (true);

create or replace function update_score_with_history(p_game_id uuid, p_score1 int, p_score2 int) returns void as $$
declare oldrow game_scores%rowtype;
begin
  select * into oldrow from game_scores where game_id=p_game_id;
  insert into score_history(game_id,old_score1,old_score2,new_score1,new_score2) values(p_game_id,oldrow.score1,oldrow.score2,p_score1,p_score2);
  insert into game_scores(game_id,score1,score2,updated_at) values(p_game_id,p_score1,p_score2,now()) on conflict(game_id) do update set score1=excluded.score1, score2=excluded.score2, updated_at=now();
end; $$ language plpgsql security definer;

create or replace function undo_last_score() returns void as $$
declare h score_history%rowtype;
begin
  select * into h from score_history order by created_at desc limit 1;
  if h.id is null then return; end if;
  insert into game_scores(game_id,score1,score2,updated_at) values(h.game_id,h.old_score1,h.old_score2,now()) on conflict(game_id) do update set score1=h.old_score1, score2=h.old_score2, updated_at=now();
  delete from score_history where id=h.id;
end; $$ language plpgsql security definer;

do $$ begin alter publication supabase_realtime add table leagues; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table weeks; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table players; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table teams; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table team_players; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table matches; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table match_games; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table game_scores; exception when duplicate_object then null; end $$;
