import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Home, Users, Shield, Swords, Trophy, Star, Settings,
  Flame, Plus, Trash2, RotateCcw, Download, AlertTriangle
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const teamColors = [
  ['Red', '🔴', '#ef4444'],
  ['Blue', '🔵', '#38bdf8'],
  ['Green', '🟢', '#22c55e'],
  ['Yellow', '🟡', '#facc15'],
  ['Orange', '🟠', '#fb923c'],
  ['Purple', '🟣', '#a78bfa'],
  ['Black', '⚫', '#9ca3af'],
  ['White', '⚪', '#e5e7eb'],
];

function pairs(players) {
  const out = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) out.push([players[i], players[j]]);
  }
  return out;
}

function validateTeamAsk(playerCount, teamCount) {
  if (!teamCount || teamCount < 2) return 'You need at least 2 teams.';
  if (playerCount < 4) return 'Doubles league needs at least 4 players.';
  if (teamCount > playerCount) return 'Teams cannot be more than players.';
  if (Math.floor(playerCount / teamCount) < 2) {
    return `${playerCount} players cannot make ${teamCount} doubles teams. Each team needs at least 2 players.`;
  }
  return '';
}


function validatePlayersPerTeam(playerCount, playersPerTeam) {
  if (!Number.isInteger(playersPerTeam)) {
    return 'Players per team must be a whole number.';
  }

  if (![2, 3, 4].includes(playersPerTeam)) {
    return 'Choose 2, 3, or 4 players per team.';
  }

  if (playerCount < playersPerTeam * 2) {
    return `You need at least ${playersPerTeam * 2} players to create 2 teams of ${playersPerTeam}.`;
  }

  if (playerCount % playersPerTeam !== 0) {
    return `${playerCount} players cannot be divided evenly into teams of ${playersPerTeam}. Add or remove players, or choose a different team size.`;
  }

  return '';
}


function generateRoundRobinRounds(teamList) {
  const teams = [...teamList];
  if (teams.length % 2 === 1) teams.push(null);

  const rounds = [];
  const n = teams.length;

  for (let round = 0; round < n - 1; round++) {
    const roundPairs = [];

    for (let i = 0; i < n / 2; i++) {
      const teamA = teams[i];
      const teamB = teams[n - 1 - i];
      if (teamA && teamB) roundPairs.push([teamA, teamB]);
    }

    rounds.push(roundPairs);

    const fixed = teams[0];
    const rotated = [fixed, teams[n - 1], ...teams.slice(1, n - 1)];
    teams.splice(0, teams.length, ...rotated);
  }

  return rounds;
}


function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomizedPairOrder(players) {
  const allPairs = pairs(players);
  if (!allPairs.length) return [];

  if (players.length === 3 && allPairs.length === 3) {
    return shuffleArray(allPairs);
  }

  const selected = [];
  const appearances = Object.fromEntries(players.map((p) => [p.id, 0]));
  let remaining = shuffleArray(allPairs);

  while (selected.length < 3 && remaining.length) {
    remaining.sort((a, b) => {
      const aScore = appearances[a[0].id] + appearances[a[1].id] + Math.random();
      const bScore = appearances[b[0].id] + appearances[b[1].id] + Math.random();
      return aScore - bScore;
    });
    const pair = remaining.shift();
    selected.push(pair);
    appearances[pair[0].id]++;
    appearances[pair[1].id]++;
  }

  while (selected.length < 3) {
    selected.push(allPairs[selected.length % allPairs.length]);
  }

  return selected;
}



function normalizePlayerName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function teammatePairKey(nameA, nameB) {
  return [normalizePlayerName(nameA), normalizePlayerName(nameB)].sort().join('|');
}

function teamPairKeysFromNames(playerNames) {
  const names = playerNames.map(normalizePlayerName).filter(Boolean);
  const keys = [];

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      keys.push(teammatePairKey(names[i], names[j]));
    }
  }

  return keys;
}

function hasRepeatedTeammates(candidateTeams, forbiddenPairs) {
  return candidateTeams.some((team) =>
    teamPairKeysFromNames(team.players.map((player) => player.name))
      .some((pairKey) => forbiddenPairs.has(pairKey))
  );
}

function buildBalancedTeamDefs(teamPlayers, count) {
  const baseSize = Math.floor(teamPlayers.length / count);
  const remainder = teamPlayers.length % count;

  return Array.from({ length: count }, (_, index) => ({
    name: teamColors[index % teamColors.length][0],
    emoji: teamColors[index % teamColors.length][1],
    color: teamColors[index % teamColors.length][2],
    targetSize: baseSize + (index < remainder ? 1 : 0),
    players: [],
  }));
}

function shuffled(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function buildConstraintAwareTeams(teamPlayers, count, forbiddenPairs) {
  const normalizedNames = teamPlayers.map((player) => normalizePlayerName(player.name));
  const duplicates = normalizedNames.filter((name, index) => normalizedNames.indexOf(name) !== index);

  if (duplicates.length) {
    throw new Error(
      `Duplicate player names detected: ${[...new Set(duplicates)].join(', ')}. Player names must be unique inside a week so teammate history can be checked correctly.`
    );
  }

  const conflictDegree = {};
  normalizedNames.forEach((name) => { conflictDegree[name] = 0; });

  for (let i = 0; i < normalizedNames.length; i++) {
    for (let j = i + 1; j < normalizedNames.length; j++) {
      if (forbiddenPairs.has(teammatePairKey(normalizedNames[i], normalizedNames[j]))) {
        conflictDegree[normalizedNames[i]]++;
        conflictDegree[normalizedNames[j]]++;
      }
    }
  }

  const maxRestarts = 160;
  const maxNodesPerRestart = 120000;

  for (let restart = 0; restart < maxRestarts; restart++) {
    const defs = buildBalancedTeamDefs(teamPlayers, count);
    const orderedPlayers = shuffled(teamPlayers).sort((a, b) => {
      const degreeDifference =
        (conflictDegree[normalizePlayerName(b.name)] || 0) -
        (conflictDegree[normalizePlayerName(a.name)] || 0);

      return degreeDifference || Math.random() - 0.5;
    });

    let visitedNodes = 0;

    function canJoin(player, team) {
      if (team.players.length >= team.targetSize) return false;

      return team.players.every((member) =>
        !forbiddenPairs.has(teammatePairKey(player.name, member.name))
      );
    }

    function assign(index) {
      visitedNodes++;
      if (visitedNodes > maxNodesPerRestart) return false;
      if (index >= orderedPlayers.length) return true;

      const player = orderedPlayers[index];
      const candidateIndexes = shuffled(
        defs
          .map((team, teamIndex) => ({ team, teamIndex }))
          .filter(({ team }) => canJoin(player, team))
      )
        .sort((a, b) =>
          a.team.players.length - b.team.players.length ||
          b.team.targetSize - a.team.targetSize
        )
        .map(({ teamIndex }) => teamIndex);

      const seenEquivalentTeams = new Set();

      for (const teamIndex of candidateIndexes) {
        const team = defs[teamIndex];
        const teamState = team.players
          .map((member) => normalizePlayerName(member.name))
          .sort()
          .join('|');

        const symmetryKey = `${team.targetSize}:${teamState}`;
        if (seenEquivalentTeams.has(symmetryKey)) continue;
        seenEquivalentTeams.add(symmetryKey);

        team.players.push(player);

        if (assign(index + 1)) return true;

        team.players.pop();
      }

      return false;
    }

    if (assign(0)) {
      return defs.map(({ targetSize, ...team }) => team);
    }
  }

  return null;
}


export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [mode, setMode] = useState('auto');
  const [leagues, setLeagues] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [games, setGames] = useState([]);
  const [scores, setScores] = useState([]);
  const [leagueId, setLeagueId] = useState('');
  const [weekId, setWeekId] = useState('');
  const [names, setNames] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [manual, setManual] = useState({ teamCount: 4, assignments: {} });
  const [draft, setDraft] = useState({});
  const [weekCost, setWeekCost] = useState(null);
  const [overallRows, setOverallRows] = useState([]);
  const [overallCalculatedAt, setOverallCalculatedAt] = useState(null);
  const [quickTeam1Id, setQuickTeam1Id] = useState('');
  const [quickTeam2Id, setQuickTeam2Id] = useState('');
  const [playerGameSearch, setPlayerGameSearch] = useState('');

  const league = leagues.find((l) => l.id === leagueId);
  const week = weeks.find((w) => w.id === weekId);

  useEffect(() => { boot(); }, []);
  useEffect(() => { if (leagueId) { loadWeeks(true); loadOverallLeaderboard(); } }, [leagueId]);
  useEffect(() => { if (weekId) { loadWeekData(); loadWeekCost(); } else clearWeekData(); }, [weekId]);

  useEffect(() => {
    setQuickTeam1Id('');
    setQuickTeam2Id('');
    setPlayerGameSearch('');
  }, [weekId]);

  useEffect(() => {
    setDraft((current) => {
      const next = { ...current };
      scores.forEach((s) => {
        if (!next[s.game_id]?.dirty) {
          next[s.game_id] = {
            score1: s.score1 === null || s.score1 === undefined ? '' : String(s.score1),
            score2: s.score2 === null || s.score2 === undefined ? '' : String(s.score2),
            dirty: false,
          };
        }
      });
      return next;
    });
  }, [scores]);

  useEffect(() => {
    const channel = supabase.channel('ff-realtime-v8')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leagues' }, () => loadLeagues(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weeks' }, () => loadWeeks(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => loadWeekData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => loadWeekData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_players' }, () => loadWeekData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => loadWeekData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_games' }, () => loadWeekData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_scores' }, () => loadWeekData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'week_costs' }, () => loadWeekCost())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'overall_leaderboards' }, () => loadOverallLeaderboard())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [leagueId, weekId]);

  function fail(msg) {
    setError(msg);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return false;
  }

  function clearWeekData() {
    setPlayers([]);
    setTeams([]);
    setTeamPlayers([]);
    setMatches([]);
    setGames([]);
    setScores([]);
    setDraft({});
    setWeekCost(null);
  }

  function timeValue(value) {
    const parsed = value ? Date.parse(value) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function bumpWeekActivity(activityMap, targetWeekId, dateValue) {
    if (!targetWeekId) return;
    const value = timeValue(dateValue);
    if (value > (activityMap[targetWeekId] || 0)) {
      activityMap[targetWeekId] = value;
    }
  }

  async function buildWeekActivityMap(weekRows) {
    const rows = weekRows || [];
    const weekIds = rows.map((item) => item.id);
    const activityMap = {};

    rows.forEach((item) => bumpWeekActivity(activityMap, item.id, item.created_at));

    if (!weekIds.length) return activityMap;

    const [
      playerResult,
      teamResult,
      matchResult,
      costResult,
    ] = await Promise.all([
      supabase.from('players').select('week_id, created_at').in('week_id', weekIds),
      supabase.from('teams').select('week_id, created_at').in('week_id', weekIds),
      supabase.from('matches').select('id, week_id, created_at').in('week_id', weekIds),
      supabase.from('week_costs').select('week_id, updated_at').in('week_id', weekIds),
    ]);

    (playerResult.data || []).forEach((item) => bumpWeekActivity(activityMap, item.week_id, item.created_at));
    (teamResult.data || []).forEach((item) => bumpWeekActivity(activityMap, item.week_id, item.created_at));
    (matchResult.data || []).forEach((item) => bumpWeekActivity(activityMap, item.week_id, item.created_at));
    (costResult.data || []).forEach((item) => bumpWeekActivity(activityMap, item.week_id, item.updated_at));

    const matchRows = matchResult.data || [];
    const matchIds = matchRows.map((item) => item.id);
    const matchWeekById = Object.fromEntries(matchRows.map((item) => [item.id, item.week_id]));

    if (matchIds.length) {
      const gameResult = await supabase
        .from('match_games')
        .select('id, match_id')
        .in('match_id', matchIds);

      const gameRows = gameResult.data || [];
      const gameIds = gameRows.map((item) => item.id);
      const gameWeekById = Object.fromEntries(
        gameRows.map((item) => [item.id, matchWeekById[item.match_id]])
      );

      if (gameIds.length) {
        const scoreResult = await supabase
          .from('game_scores')
          .select('game_id, updated_at')
          .in('game_id', gameIds);

        (scoreResult.data || []).forEach((item) => {
          bumpWeekActivity(activityMap, gameWeekById[item.game_id], item.updated_at);
        });
      }
    }

    return activityMap;
  }

  async function sortedWeeksByActivity(weekRows) {
    const rows = weekRows || [];
    const activityMap = await buildWeekActivityMap(rows);

    return [...rows].sort((a, b) =>
      (activityMap[b.id] || 0) - (activityMap[a.id] || 0) ||
      timeValue(b.created_at) - timeValue(a.created_at)
    );
  }

  async function boot() {
    await loadLeagues(true);
  }

  async function loadLeagues(selectFirst = true) {
    const { data, error: err } = await supabase
      .from('leagues')
      .select('*')
      .order('created_at', { ascending: false });

    if (err) return fail(err.message);

    if (!data?.length) {
      const { data: newLeague, error: leagueError } = await supabase
        .from('leagues')
        .insert({ name: "Men's League" })
        .select()
        .single();

      if (leagueError) return fail(leagueError.message);

      const { data: newWeek, error: weekError } = await supabase
        .from('weeks')
        .insert({ league_id: newLeague.id, name: 'Week 1' })
        .select()
        .single();

      if (weekError) return fail(weekError.message);

      setLeagues([newLeague]);
      setLeagueId(newLeague.id);
      setWeeks([newWeek]);
      setWeekId(newWeek.id);
      return;
    }

    setLeagues(data);

    if (selectFirst && !leagueId) {
      const { data: allWeeks, error: weekErr } = await supabase
        .from('weeks')
        .select('*');

      if (weekErr) return fail(weekErr.message);

      const activeWeeks = await sortedWeeksByActivity(allWeeks || []);

      if (activeWeeks.length) {
        setLeagueId(activeWeeks[0].league_id);
        setWeekId(activeWeeks[0].id);
      } else {
        setLeagueId(data[0].id);
      }
    }
  }

  async function loadWeeks(selectFirst = true) {
    if (!leagueId) return;

    const { data, error: err } = await supabase
      .from('weeks')
      .select('*')
      .eq('league_id', leagueId);

    if (err) return fail(err.message);

    const list = await sortedWeeksByActivity(data || []);
    setWeeks(list);

    if (!list.length) {
      setWeekId('');
      clearWeekData();
      return;
    }

    if (selectFirst || !weekId || !list.find((w) => w.id === weekId)) {
      setWeekId(list[0].id);
    }
  }

  async function loadWeekData() {
    if (!weekId) {
      clearWeekData();
      return;
    }

    const [p, t, tp, m, g, s] = await Promise.all([
      supabase.from('players').select('*').eq('week_id', weekId).order('created_at'),
      supabase.from('teams').select('*').eq('week_id', weekId).order('created_at'),
      supabase.from('team_players').select('*'),
      supabase.from('matches').select('*').eq('week_id', weekId).order('slot').order('court'),
      supabase.from('match_games').select('*'),
      supabase.from('game_scores').select('*'),
    ]);

    setPlayers(p.data || []);
    setTeams(t.data || []);
    setTeamPlayers(tp.data || []);
    setMatches(m.data || []);
    setGames(g.data || []);
    setScores(s.data || []);
  }

  async function act(fn) {
    setError('');
    setSaving(true);
    try {
      await fn();
      await loadWeekData();
    } catch (e) {
      fail(e.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  function team(id) {
    return teams.find((t) => t.id === id);
  }

  function scoreFor(gameId) {
    return scores.find((s) => s.game_id === gameId) || {};
  }

  function playerName(id) {
    return players.find((p) => p.id === id)?.name || '-';
  }

  function playersForTeam(teamId) {
    return teamPlayers
      .filter((x) => x.team_id === teamId)
      .map((x) => players.find((p) => p.id === x.player_id))
      .filter(Boolean);
  }

  function teamMembersText(teamId) {
    const members = playersForTeam(teamId).map((p) => p.name);
    return members.length ? members.join(' · ') : 'No players assigned';
  }

  function TeamLabel({ teamId }) {
    const t = team(teamId);
    if (!t) return <span>-</span>;
    return (
      <div>
        <div className="pill" style={{ background: `${t.color}33`, color: t.color }}>
          {t.emoji} {t.name}
        </div>
        <div className="teamMembers">{teamMembersText(teamId)}</div>
      </div>
    );
  }

  async function addPlayers() {
    if (!weekId) return fail('No week is selected. Create or select a week before adding players.');
    const arr = names.split('\n').map((x) => x.trim()).filter(Boolean);
    if (!arr.length) return fail('Paste at least one player name.');

    await act(async () => {
      const { error: err } = await supabase
        .from('players')
        .upsert(arr.map((name) => ({ week_id: weekId, name })), { onConflict: 'week_id,name' });
      if (err) throw err;
      setNames('');
    });
  }

  async function removePlayer(player) {
    if (!confirm(`Remove ${player.name}? This may remove related team/game rows.`)) return;
    await act(async () => {
      const { error: err } = await supabase.from('players').delete().eq('id', player.id);
      if (err) throw err;
    });
  }

  async function newLeague() {
    const name = prompt('League name?');
    if (!name) return;

    await act(async () => {
      const { data: newLeague, error: lErr } = await supabase.from('leagues').insert({ name }).select().single();
      if (lErr) throw lErr;
      const { data: newWeek, error: wErr } = await supabase.from('weeks').insert({ league_id: newLeague.id, name: 'Week 1' }).select().single();
      if (wErr) throw wErr;
      setLeagueId(newLeague.id);
      setWeekId(newWeek.id);
    });
  }

  async function newWeek() {
    if (!leagueId) return fail('No league is selected.');
    const name = prompt('Week name?', `Week ${weeks.length + 1}`);
    if (!name) return;

    await act(async () => {
      const { data: newWeekRow, error: err } = await supabase.from('weeks').insert({ league_id: leagueId, name }).select().single();
      if (err) throw err;
      setWeekId(newWeekRow.id);
    });
  }

  async function renameWeek() {
    if (!weekId) return fail('No week is selected.');
    const name = prompt('Rename week:', week?.name || '');
    if (!name) return;

    await act(async () => {
      const { error: err } = await supabase.from('weeks').update({ name }).eq('id', weekId);
      if (err) throw err;
      await loadWeeks(false);
    });
  }

  async function deleteWeek() {
    if (!weekId) return fail('No week is selected.');
    if (weeks.length <= 1) return fail('Cannot delete the only week in this league. Create another week first.');

    const nextWeek = weeks.find((w) => w.id !== weekId);
    if (!confirm(`Delete ${week?.name || 'this week'}? This deletes only that week.`)) return;

    await act(async () => {
      const { error: err } = await supabase.from('weeks').delete().eq('id', weekId);
      if (err) throw err;
      setWeekId(nextWeek?.id || '');
    });
  }

  async function deleteLeague() {
    if (!leagueId) return fail('No league is selected.');
    if (leagues.length <= 1) return fail('Cannot delete the only league. Create another league first.');

    const nextLeague = leagues.find((l) => l.id !== leagueId);
    if (!confirm('Delete entire league? This removes all weeks in this league only.')) return;

    await act(async () => {
      const { error: err } = await supabase.from('leagues').delete().eq('id', leagueId);
      if (err) throw err;
      setLeagueId(nextLeague?.id || '');
      setWeekId('');
      clearWeekData();
    });
  }

  async function clearWeekSchedule() {
    await supabase.from('teams').delete().eq('week_id', weekId);
  }

  async function buildTeamsAndSchedule(teamDefs) {
    if (teamDefs.some((t) => t.players.length < 2)) throw new Error('Every team must have at least 2 players.');

    await clearWeekSchedule();

    const { data: insertedTeams, error: tErr } = await supabase
      .from('teams')
      .insert(teamDefs.map((t) => ({ week_id: weekId, name: t.name, emoji: t.emoji, color: t.color })))
      .select();
    if (tErr) throw tErr;

    const links = [];
    teamDefs.forEach((t, i) => t.players.forEach((p) => links.push({ team_id: insertedTeams[i].id, player_id: p.id })));

    const { error: linkErr } = await supabase.from('team_players').insert(links);
    if (linkErr) throw linkErr;

    const matchRows = [];
    const rounds = generateRoundRobinRounds(insertedTeams);

    rounds.forEach((roundPairs, roundIndex) => {
      roundPairs.forEach(([teamA, teamB], courtIndex) => {
        matchRows.push({
          week_id: weekId,
          slot: roundIndex + 1,
          court: String.fromCharCode(65 + courtIndex),
          team1_id: teamA.id,
          team2_id: teamB.id,
        });
      });
    });

    const { data: insertedMatches, error: mErr } = await supabase.from('matches').insert(matchRows).select();
    if (mErr) throw mErr;

    const teamMap = Object.fromEntries(insertedTeams.map((t, i) => [t.id, teamDefs[i].players]));
    const gameRows = [];

    const isTwoPlayerTeamFormat = teamDefs.every((teamDef) => teamDef.players.length === 2);
    const gamesPerTeamMatch = isTwoPlayerTeamFormat ? 1 : 3;

    insertedMatches.forEach((match) => {
      const t1Pairs = randomizedPairOrder(teamMap[match.team1_id]);
      const t2Pairs = randomizedPairOrder(teamMap[match.team2_id]);
      if (!t1Pairs.length || !t2Pairs.length) throw new Error('Cannot create doubles games because a team has fewer than 2 players.');

      Array.from({ length: gamesPerTeamMatch }, (_, n) => n).forEach((n) => {
        gameRows.push({
          match_id: match.id,
          game_number: n + 1,
          t1_player1_id: t1Pairs[n % t1Pairs.length][0].id,
          t1_player2_id: t1Pairs[n % t1Pairs.length][1].id,
          t2_player1_id: t2Pairs[n % t2Pairs.length][0].id,
          t2_player2_id: t2Pairs[n % t2Pairs.length][1].id,
        });
      });
    });

    const { error: gErr } = await supabase.from('match_games').insert(gameRows);
    if (gErr) throw gErr;
  }



  async function getHistoricalTeammatePairSets() {
    const empty = {
      allLeague: new Set(),
      lastTwoWeeks: new Set(),
      lastWeek: new Set(),
    };

    if (!leagueId || !weekId) return empty;

    const currentWeek = weeks.find((item) => item.id === weekId);
    if (!currentWeek) return empty;

    const historicalWeeks = weeks
      .filter(
        (item) =>
          item.id !== weekId &&
          new Date(item.created_at) < new Date(currentWeek.created_at)
      )
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (!historicalWeeks.length) return empty;

    const allWeekIds = historicalWeeks.map((item) => item.id);
    const lastTwoWeekIds = historicalWeeks.slice(0, 2).map((item) => item.id);
    const lastWeekId = historicalWeeks[0]?.id;

    const [historicalTeamsResult, historicalPlayersResult] = await Promise.all([
      supabase
        .from('teams')
        .select('id, week_id')
        .in('week_id', allWeekIds),
      supabase
        .from('players')
        .select('id, week_id, name')
        .in('week_id', allWeekIds),
    ]);

    if (historicalTeamsResult.error) throw historicalTeamsResult.error;
    if (historicalPlayersResult.error) throw historicalPlayersResult.error;

    const historicalTeams = historicalTeamsResult.data || [];
    const historicalPlayers = historicalPlayersResult.data || [];
    const teamIds = historicalTeams.map((item) => item.id);

    if (!teamIds.length) return empty;

    const { data: historicalLinks, error: linkError } = await supabase
      .from('team_players')
      .select('team_id, player_id')
      .in('team_id', teamIds);

    if (linkError) throw linkError;

    const teamWeekById = Object.fromEntries(
      historicalTeams.map((item) => [item.id, item.week_id])
    );

    const playerNameById = Object.fromEntries(
      historicalPlayers.map((item) => [item.id, normalizePlayerName(item.name)])
    );

    const playerNamesByTeam = {};

    (historicalLinks || []).forEach((link) => {
      const normalizedName = playerNameById[link.player_id];
      if (!normalizedName) return;

      if (!playerNamesByTeam[link.team_id]) playerNamesByTeam[link.team_id] = [];
      playerNamesByTeam[link.team_id].push(normalizedName);
    });

    const allLeague = new Set();
    const lastTwoWeeks = new Set();
    const lastWeek = new Set();

    Object.entries(playerNamesByTeam).forEach(([teamId, playerNames]) => {
      const historicalWeekId = teamWeekById[teamId];
      const pairKeys = teamPairKeysFromNames(playerNames);

      pairKeys.forEach((pairKey) => {
        allLeague.add(pairKey);

        if (lastTwoWeekIds.includes(historicalWeekId)) {
          lastTwoWeeks.add(pairKey);
        }

        if (historicalWeekId === lastWeekId) {
          lastWeek.add(pairKey);
        }
      });
    });

    return { allLeague, lastTwoWeeks, lastWeek };
  }

  function findTeamDefsWithAvoidance(count, historicalPairs) {
    const levels = [
      {
        name: 'the entire league history',
        pairs: historicalPairs.allLeague,
        relaxed: false,
      },
      {
        name: 'the last 2 weeks',
        pairs: historicalPairs.lastTwoWeeks,
        relaxed: true,
      },
      {
        name: 'the immediately previous week',
        pairs: historicalPairs.lastWeek,
        relaxed: true,
      },
    ];

    for (const level of levels) {
      const defs = buildConstraintAwareTeams(players, count, level.pairs);

      if (defs && !hasRepeatedTeammates(defs, level.pairs)) {
        return {
          defs,
          levelUsed: level.name,
          relaxed: level.relaxed,
        };
      }
    }

    return {
      defs: null,
      levelUsed: null,
      relaxed: true,
    };
  }

  async function randomTeams() {
    if (!weekId) {
      return fail('No week is selected. Create or select a week first.');
    }

    const suggestedPlayersPerTeam =
      players.length % 3 === 0
        ? 3
        : players.length % 2 === 0
          ? 2
          : 4;

    const response = prompt(
      'How many players should be in each team? Enter 2, 3, or 4.',
      suggestedPlayersPerTeam
    );

    // Cancel must leave all existing teams, matches and scores untouched.
    if (response === null) return;

    const playersPerTeam = Number(String(response).trim());
    const teamSizeValidation = validatePlayersPerTeam(players.length, playersPerTeam);
    if (teamSizeValidation) return fail(teamSizeValidation);

    const teamCount = players.length / playersPerTeam;
    const teamCountValidation = validateTeamAsk(players.length, teamCount);
    if (teamCountValidation) return fail(teamCountValidation);

    await act(async () => {
      const historicalPairs = await getHistoricalTeammatePairSets();
      const result = findTeamDefsWithAvoidance(teamCount, historicalPairs);

      if (!result.defs) {
        throw new Error(
          'No valid team arrangement could satisfy even the final rule of avoiding teammate repeats from the immediately previous week. Change the players-per-team value, add more players, or use Handpick Teams.'
        );
      }

      const wrongTeamSize = result.defs.some(
        (teamDef) => teamDef.players.length !== playersPerTeam
      );

      if (wrongTeamSize) {
        throw new Error(
          `The generator could not create equal teams of ${playersPerTeam}. Please try again.`
        );
      }

      if (result.relaxed) {
        alert(
          `A full league-history separation was mathematically unavailable. The teams were generated using the next strongest rule: no teammate repeats from ${result.levelUsed}.`
        );
      }

      await buildTeamsAndSchedule(result.defs);
    });
  }

  function setManualAssign(playerId, teamIndex) {
    setManual((m) => ({ ...m, assignments: { ...m.assignments, [playerId]: teamIndex } }));
  }

  async function saveManualTeams() {
    if (!weekId) return fail('No week is selected. Create or select a week first.');
    const count = Number(manual.teamCount);
    const validation = validateTeamAsk(players.length, count);
    if (validation) return fail(validation);

    const assignedIds = Object.keys(manual.assignments).filter((pid) => manual.assignments[pid] !== '' && manual.assignments[pid] != null);
    if (assignedIds.length !== players.length) return fail(`Assign all players before saving. ${players.length - assignedIds.length} unassigned.`);

    const defs = Array.from({ length: count }, (_, i) => ({
      name: teamColors[i % teamColors.length][0],
      emoji: teamColors[i % teamColors.length][1],
      color: teamColors[i % teamColors.length][2],
      players: [],
    }));

    players.forEach((p) => defs[Number(manual.assignments[p.id])].players.push(p));
    const smallTeam = defs.find((t) => t.players.length < 2);
    if (smallTeam) return fail(`${smallTeam.name} has fewer than 2 players.`);

    await act(async () => buildTeamsAndSchedule(defs));
  }

  function draftChange(gameId, side, value) {
    const clean = String(value).replace(/[^0-9]/g, '');
    if (clean !== '' && Number(clean) > 99) return fail('Scores must be between 0 and 99.');

    setError('');
    const db = scoreFor(gameId);

    setDraft((d) => ({
      ...d,
      [gameId]: {
        score1: d[gameId]?.score1 ?? (db.score1 == null ? '' : String(db.score1)),
        score2: d[gameId]?.score2 ?? (db.score2 == null ? '' : String(db.score2)),
        [side]: clean,
        dirty: true,
      },
    }));
  }

  async function saveGameScore(gameId) {
    const db = scoreFor(gameId);
    const current = draft[gameId] || {
      score1: db.score1 == null ? '' : String(db.score1),
      score2: db.score2 == null ? '' : String(db.score2),
    };

    const s1 = current.score1 == null ? '' : String(current.score1);
    const s2 = current.score2 == null ? '' : String(current.score2);

    if ((s1 === '' && s2 !== '') || (s1 !== '' && s2 === '')) {
      return fail('Enter both scores, or clear both scores.');
    }

    await act(async () => {
      const { error: err } = await supabase.rpc('update_score_with_history', {
        p_game_id: gameId,
        p_score1: s1 === '' ? null : Number(s1),
        p_score2: s2 === '' ? null : Number(s2),
      });
      if (err) throw err;
      setDraft((cur) => {
        const next = { ...cur };
        delete next[gameId];
        return next;
      });
    });
  }

  async function resetGameScore(gameId) {
    await act(async () => {
      const { error: err } = await supabase.rpc('update_score_with_history', {
        p_game_id: gameId,
        p_score1: null,
        p_score2: null,
      });
      if (err) throw err;
      setDraft((d) => ({ ...d, [gameId]: { score1: '', score2: '', dirty: false } }));
    });
  }

  async function resetMatchScores(matchId) {
    if (!confirm('Reset scores for this match?')) return;
    const matchGames = games.filter((g) => g.match_id === matchId);

    await act(async () => {
      await Promise.all(matchGames.map((g) => supabase.rpc('update_score_with_history', {
        p_game_id: g.id,
        p_score1: null,
        p_score2: null,
      })));
      setDraft((d) => {
        const next = { ...d };
        matchGames.forEach((g) => { next[g.id] = { score1: '', score2: '', dirty: false }; });
        return next;
      });
    });
  }

  async function undo() {
    await act(async () => {
      const { error: err } = await supabase.rpc('undo_last_score');
      if (err) throw err;
    });
  }

  function matchForGame(game) {
    return matches.find((match) => match.id === game.match_id);
  }

  function gamePlayerIds(game) {
    return [
      game.t1_player1_id,
      game.t1_player2_id,
      game.t2_player1_id,
      game.t2_player2_id,
    ];
  }

  function renderGameScoreEditor(game, showMatchContext = false) {
    const db = scoreFor(game.id);
    const local = draft[game.id];
    const shown = local || {
      score1: db.score1 == null ? '' : String(db.score1),
      score2: db.score2 == null ? '' : String(db.score2),
    };
    const gameMatch = matchForGame(game);

    const editor = (
      <div className="game">
        <div className="gamePair gamePairLeft">{playerName(game.t1_player1_id)} / {playerName(game.t1_player2_id)}</div>
        <input
          aria-label={`Score for ${playerName(game.t1_player1_id)} and ${playerName(game.t1_player2_id)}`}
          className="score scoreOne"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={shown.score1 ?? ''}
          onChange={(event) => draftChange(game.id, 'score1', event.target.value)}
        />
        <input
          aria-label={`Score for ${playerName(game.t2_player1_id)} and ${playerName(game.t2_player2_id)}`}
          className="score scoreTwo"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={shown.score2 ?? ''}
          onChange={(event) => draftChange(game.id, 'score2', event.target.value)}
        />
        <div className="gamePair gamePairRight">{playerName(game.t2_player1_id)} / {playerName(game.t2_player2_id)}</div>
        <div className="row gameActions">
          <button className="btn green" onClick={() => saveGameScore(game.id)}>Save</button>
          <button className="btn secondary" onClick={() => resetGameScore(game.id)}>Clear</button>
        </div>
      </div>
    );

    if (!showMatchContext) {
      return <div key={game.id}>{editor}</div>;
    }

    return (
      <div className="scoreSearchResult" key={game.id}>
        <div className="gameContext">
          <b>
            Slot {gameMatch?.slot ?? '-'} · Court {gameMatch?.court ?? '-'} · Game {game.game_number}
          </b>
          <span className="muted">
            {team(gameMatch?.team1_id)?.emoji} {team(gameMatch?.team1_id)?.name || '-'}
            {' '}vs{' '}
            {team(gameMatch?.team2_id)?.emoji} {team(gameMatch?.team2_id)?.name || '-'}
          </span>
        </div>
        {editor}
      </div>
    );
  }


  async function loadOverallLeaderboard() {
    if (!leagueId) {
      setOverallRows([]);
      setOverallCalculatedAt(null);
      return;
    }

    const { data } = await supabase
      .from('overall_leaderboards')
      .select('*')
      .eq('league_id', leagueId)
      .maybeSingle();

    setOverallRows(data?.data || []);
    setOverallCalculatedAt(data?.calculated_at || null);
  }

  function rankOverall(rows) {
    return rows
      .map((x) => ({
        ...x,
        pointDiff: (x.pointsFor || 0) - (x.pointsAgainst || 0),
        winPct: x.played ? Math.round(((x.wins || 0) / x.played) * 100) : 0,
      }))
      .sort((a, b) =>
        (b.wins || 0) - (a.wins || 0) ||
        (b.pointDiff || 0) - (a.pointDiff || 0) ||
        (b.pointsFor || 0) - (a.pointsFor || 0) ||
        a.player.localeCompare(b.player)
      );
  }

  async function calculateOverallLeaderboard() {
    if (!leagueId) return fail('No league is selected.');

    await act(async () => {
      const { data: leagueWeeks, error: wErr } = await supabase
        .from('weeks')
        .select('id,name')
        .eq('league_id', leagueId);
      if (wErr) throw wErr;

      const weekIds = (leagueWeeks || []).map((w) => w.id);
      if (!weekIds.length) return fail('This league has no weeks to calculate.');

      const [pRes, mRes] = await Promise.all([
        supabase.from('players').select('*').in('week_id', weekIds),
        supabase.from('matches').select('*').in('week_id', weekIds),
      ]);
      if (pRes.error) throw pRes.error;
      if (mRes.error) throw mRes.error;

      const allPlayers = pRes.data || [];
      const allMatches = mRes.data || [];
      const matchIds = allMatches.map((m) => m.id);
      const playerById = Object.fromEntries(allPlayers.map((p) => [p.id, p]));

      if (!matchIds.length) {
        await supabase.from('overall_leaderboards').upsert({
          league_id: leagueId,
          data: [],
          calculated_at: new Date().toISOString(),
        });
        setOverallRows([]);
        return;
      }

      const { data: allGames, error: gErr } = await supabase
        .from('match_games')
        .select('*')
        .in('match_id', matchIds);
      if (gErr) throw gErr;

      const gameIds = (allGames || []).map((g) => g.id);
      const { data: allScores, error: sErr } = gameIds.length
        ? await supabase.from('game_scores').select('*').in('game_id', gameIds)
        : { data: [], error: null };
      if (sErr) throw sErr;

      const scoreByGame = Object.fromEntries((allScores || []).map((s) => [s.game_id, s]));
      const stats = {};

      function ensure(name) {
        if (!stats[name]) stats[name] = { player: name, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };
        return stats[name];
      }

      (allGames || []).forEach((game) => {
        const score = scoreByGame[game.id];
        if (!score || score.score1 == null || score.score2 == null) return;

        const s1 = Number(score.score1);
        const s2 = Number(score.score2);

        [game.t1_player1_id, game.t1_player2_id].forEach((id) => {
          const player = playerById[id];
          if (!player) return;
          const row = ensure(player.name);
          row.played++;
          row.pointsFor += s1;
          row.pointsAgainst += s2;
          if (s1 > s2) row.wins++;
          else if (s2 > s1) row.losses++;
        });

        [game.t2_player1_id, game.t2_player2_id].forEach((id) => {
          const player = playerById[id];
          if (!player) return;
          const row = ensure(player.name);
          row.played++;
          row.pointsFor += s2;
          row.pointsAgainst += s1;
          if (s2 > s1) row.wins++;
          else if (s1 > s2) row.losses++;
        });
      });

      const ranked = rankOverall(Object.values(stats));

      if ((overallRows || []).length) {
        await supabase.from('overall_leaderboard_history').insert({ league_id: leagueId, data: overallRows });
      }

      const calculatedAt = new Date().toISOString();
      const { error: upsertErr } = await supabase.from('overall_leaderboards').upsert({
        league_id: leagueId,
        data: ranked,
        calculated_at: calculatedAt,
      });
      if (upsertErr) throw upsertErr;

      setOverallRows(ranked);
      setOverallCalculatedAt(calculatedAt);
    });
  }

  async function clearOverallLeaderboard() {
    if (!leagueId) return fail('No league is selected.');
    if (!confirm('Clear the overall leaderboard for this league?')) return;

    await act(async () => {
      if ((overallRows || []).length) {
        await supabase.from('overall_leaderboard_history').insert({ league_id: leagueId, data: overallRows });
      }

      const calculatedAt = new Date().toISOString();
      const { error: err } = await supabase.from('overall_leaderboards').upsert({
        league_id: leagueId,
        data: [],
        calculated_at: calculatedAt,
      });
      if (err) throw err;

      setOverallRows([]);
      setOverallCalculatedAt(calculatedAt);
    });
  }

  async function undoOverallLeaderboard() {
    if (!leagueId) return fail('No league is selected.');

    await act(async () => {
      const { data: last, error: hErr } = await supabase
        .from('overall_leaderboard_history')
        .select('*')
        .eq('league_id', leagueId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (hErr) throw hErr;
      if (!last) return fail('There is no previous overall leaderboard to restore.');

      const calculatedAt = new Date().toISOString();
      const { error: upsertErr } = await supabase.from('overall_leaderboards').upsert({
        league_id: leagueId,
        data: last.data || [],
        calculated_at: calculatedAt,
      });
      if (upsertErr) throw upsertErr;

      await supabase.from('overall_leaderboard_history').delete().eq('id', last.id);

      setOverallRows(last.data || []);
      setOverallCalculatedAt(calculatedAt);
    });
  }


  async function loadWeekCost() {
    if (!weekId) {
      setWeekCost(null);
      return;
    }

    const { data } = await supabase
      .from('week_costs')
      .select('*')
      .eq('week_id', weekId)
      .maybeSingle();

    setWeekCost(data || {
      week_id: weekId,
      cost_per_birdie: 0,
      birdie_count: 0,
      court_booking_cost: 0,
      player_count_override: null,
    });
  }

  function updateCostDraft(field, value) {
    const clean = value === '' ? '' : String(value).replace(/[^0-9.]/g, '');
    setWeekCost((current) => ({
      ...(current || {
        week_id: weekId,
        cost_per_birdie: 0,
        birdie_count: 0,
        court_booking_cost: 0,
        player_count_override: null,
      }),
      [field]: clean,
    }));
  }

  async function saveWeekCost() {
    if (!weekId) return fail('No week is selected.');

    const payload = {
      week_id: weekId,
      cost_per_birdie: Number(weekCost?.cost_per_birdie || 0),
      birdie_count: Number(weekCost?.birdie_count || 0),
      court_booking_cost: Number(weekCost?.court_booking_cost || 0),
      player_count_override: weekCost?.player_count_override === '' || weekCost?.player_count_override == null
        ? null
        : Number(weekCost.player_count_override),
      updated_at: new Date().toISOString(),
    };

    if (payload.cost_per_birdie < 0 || payload.birdie_count < 0 || payload.court_booking_cost < 0) {
      return fail('Costs and birdie count cannot be negative.');
    }

    if (payload.player_count_override !== null && payload.player_count_override <= 0) {
      return fail('Player count must be greater than 0.');
    }

    await act(async () => {
      const { error: err } = await supabase.from('week_costs').upsert(payload);
      if (err) throw err;
      setWeekCost(payload);
    });
  }

  async function clearWeekCost() {
    if (!weekId) return fail('No week is selected.');
    if (!confirm('Clear cost details for this week?')) return;

    await act(async () => {
      const { error: err } = await supabase.from('week_costs').delete().eq('week_id', weekId);
      if (err) throw err;
      setWeekCost({
        week_id: weekId,
        cost_per_birdie: 0,
        birdie_count: 0,
        court_booking_cost: 0,
        player_count_override: null,
      });
    });
  }

  const costSummary = useMemo(() => {
    const costPerBirdie = Number(weekCost?.cost_per_birdie || 0);
    const birdieCount = Number(weekCost?.birdie_count || 0);
    const courtCost = Number(weekCost?.court_booking_cost || 0);
    const playerCount = Number(weekCost?.player_count_override || players.length || 0);
    const birdieTotal = costPerBirdie * birdieCount;
    const total = birdieTotal + courtCost;
    const perPerson = playerCount > 0 ? total / playerCount : 0;
    return { costPerBirdie, birdieCount, courtCost, playerCount, birdieTotal, total, perPerson };
  }, [weekCost, players.length]);


  const playerStandings = useMemo(() => {
    const stats = {};
    players.forEach((p) => {
      stats[p.id] = { id: p.id, player: p.name, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };
    });

    games.forEach((game) => {
      const score = scoreFor(game.id);
      if (score.score1 == null || score.score2 == null) return;

      const a = Number(score.score1);
      const b = Number(score.score2);

      [game.t1_player1_id, game.t1_player2_id].forEach((id) => {
        if (!stats[id]) return;
        stats[id].played++;
        stats[id].pointsFor += a;
        stats[id].pointsAgainst += b;
        if (a > b) stats[id].wins++;
        else if (b > a) stats[id].losses++;
      });

      [game.t2_player1_id, game.t2_player2_id].forEach((id) => {
        if (!stats[id]) return;
        stats[id].played++;
        stats[id].pointsFor += b;
        stats[id].pointsAgainst += a;
        if (b > a) stats[id].wins++;
        else if (a > b) stats[id].losses++;
      });
    });

    return Object.values(stats)
      .map((x) => ({ ...x, pointDiff: x.pointsFor - x.pointsAgainst, winPct: x.played ? Math.round((x.wins / x.played) * 100) : 0 }))
      .sort((a, b) => b.wins - a.wins || b.pointDiff - a.pointDiff || b.pointsFor - a.pointsFor || a.player.localeCompare(b.player));
  }, [players, games, scores]);

  const teamStandings = useMemo(() => {
    const stats = {};
    teams.forEach((t) => {
      stats[t.id] = { team: t, played: 0, matchWins: 0, losses: 0, draws: 0, gameWins: 0, pointsFor: 0, pointsAgainst: 0 };
    });

    matches.forEach((match) => {
      let aw = 0, bw = 0, ap = 0, bp = 0, done = 0;
      games.filter((g) => g.match_id === match.id).forEach((game) => {
        const score = scoreFor(game.id);
        if (score.score1 == null || score.score2 == null) return;
        const a = Number(score.score1);
        const b = Number(score.score2);
        done++;
        ap += a;
        bp += b;
        if (a > b) aw++;
        else if (b > a) bw++;
      });

      const A = stats[match.team1_id];
      const B = stats[match.team2_id];
      if (!A || !B) return;

      A.gameWins += aw;
      B.gameWins += bw;
      A.pointsFor += ap;
      A.pointsAgainst += bp;
      B.pointsFor += bp;
      B.pointsAgainst += ap;

      if (done) {
        A.played++;
        B.played++;
        if (aw > bw) { A.matchWins++; B.losses++; }
        else if (bw > aw) { B.matchWins++; A.losses++; }
        else { A.draws++; B.draws++; }
      }
    });

    return Object.values(stats)
      .map((x) => ({ ...x, pointDiff: x.pointsFor - x.pointsAgainst, team: { ...x.team, playersText: teamMembersText(x.team.id) } }))
      .sort((a, b) => b.matchWins - a.matchWins || b.pointDiff - a.pointDiff || b.pointsFor - a.pointsFor);
  }, [teams, matches, games, scores]);

  const quickSelectedMatch = useMemo(() => {
    if (!quickTeam1Id || !quickTeam2Id || quickTeam1Id === quickTeam2Id) return null;

    return matches.find(
      (match) =>
        (match.team1_id === quickTeam1Id && match.team2_id === quickTeam2Id) ||
        (match.team1_id === quickTeam2Id && match.team2_id === quickTeam1Id)
    ) || null;
  }, [matches, quickTeam1Id, quickTeam2Id]);

  const searchedPlayerMatches = useMemo(() => {
    const query = normalizePlayerName(playerGameSearch);
    if (!query) return [];

    return players.filter((player) =>
      normalizePlayerName(player.name).includes(query)
    );
  }, [players, playerGameSearch]);

  const searchedPlayerGames = useMemo(() => {
    if (!searchedPlayerMatches.length) return [];

    const selectedPlayerIds = new Set(searchedPlayerMatches.map((player) => player.id));

    return games
      .filter((game) => gamePlayerIds(game).some((playerId) => selectedPlayerIds.has(playerId)))
      .sort((gameA, gameB) => {
        const matchA = matches.find((match) => match.id === gameA.match_id);
        const matchB = matches.find((match) => match.id === gameB.match_id);

        return (
          Number(matchA?.slot || 0) - Number(matchB?.slot || 0) ||
          String(matchA?.court || '').localeCompare(String(matchB?.court || '')) ||
          Number(gameA.game_number || 0) - Number(gameB.game_number || 0)
        );
      });
  }, [games, matches, searchedPlayerMatches]);

  const completed = scores.filter((s) => s.score1 != null && s.score2 != null).length;

  const nav = [
    ['dashboard', 'Dashboard', Home],
    ['players', 'Players', Users],
    ['teams', 'Teams', Shield],
    ['matches', 'Matches', Swords],
    ['costs', 'Costs', Flame],
    ['team', 'Team Standings', Trophy],
    ['playersStand', 'Player Standings', Star],
    ['overall', 'Overall Standings', Flame],
    ['settings', 'Settings', Settings],
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logoBox">
          <div className="logo">FREAKN<br /><span>FETHRS</span><br /><small>LEAGUE</small></div>
        </div>

        <div className="nav">
          {nav.map(([key, label, Icon]) => (
            <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
              <Icon size={20} /> {label}
            </button>
          ))}
        </div>

        <div className="card">
          <b>{saving ? 'SAVING' : 'LIVE SYNC'}</b>
          <p className="buildMarker">Build: V18.4 Smart Default + Responsive UI</p>
          <p className="muted">Score typing is local until Save is clicked.</p>
          <button className="btn secondary" onClick={undo}><RotateCcw size={16} /> Undo Last Score</button>
        </div>
      </aside>

      <main className="main">
        {error && <div className="error"><AlertTriangle size={18} /> {error}</div>}

        <div className="header">
          <div>
            <h1>{nav.find((n) => n[0] === tab)?.[1]}</h1>
            <div className="eyebrow">{league?.name || 'No League'} · {week?.name || 'No Week'}</div>
          </div>

          <div className="row headerControls">
            <select value={leagueId} onChange={(e) => { setLeagueId(e.target.value); setWeekId(''); }}>
              {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>

            <select value={weekId} onChange={(e) => setWeekId(e.target.value)}>
              {weeks.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>

            <button className="btn" onClick={newWeek}><Plus size={16} /> Week</button>
          </div>
        </div>

        {tab === 'dashboard' && (
          <>
            <div className="grid stats">
              <div className="card stat"><Users className="statIcon" /><div><span className="muted">Players</span><b>{players.length}</b></div></div>
              <div className="card stat"><Shield className="statIcon" /><div><span className="muted">Teams</span><b>{teams.length}</b></div></div>
              <div className="card stat"><Swords className="statIcon" /><div><span className="muted">Matches</span><b>{matches.length}</b></div></div>
              <div className="card stat"><Trophy className="statIcon" /><div><span className="muted">Games Completed</span><b>{completed}/{games.length}</b></div></div>
              <div className="card stat"><Flame className="statIcon" /><div><span className="muted">Leader</span><b>{playerStandings[0]?.player || '-'}</b></div></div>
            </div>
          </>
        )}

        {tab === 'players' && (
          <div className="card">
            <h2>Players</h2>
            <textarea value={names} onChange={(e) => setNames(e.target.value)} placeholder="Paste names, one per line" />
            <button className="btn" onClick={addPlayers}>Add / Import Players</button>

            <table>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td style={{ width: 120 }}><button className="btn danger" onClick={() => removePlayer(p)}><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'teams' && (
          <div className="card">
            <h2>Team Setup</h2>
            <div className="row">
              <button className={mode === 'auto' ? 'btn' : 'btn secondary'} onClick={() => setMode('auto')}>Auto Generate</button>
              <button className={mode === 'manual' ? 'btn' : 'btn secondary'} onClick={() => setMode('manual')}>Handpick Teams</button>
            </div>

            {mode === 'auto' ? (
              <div className="card">
                <h3>Automatic Team Generator</h3>
                <button className="btn" onClick={randomTeams}>Generate Teams by Players per Team</button>
              </div>
            ) : (
              <div className="card">
                <h3>Manual Team Assignment</h3>
                <div className="row">
                  <label>Number of Teams
                    <input type="text" inputMode="numeric" value={manual.teamCount} onChange={(e) => setManual({ ...manual, teamCount: e.target.value })} />
                  </label>
                  <button className="btn green" onClick={saveManualTeams}>Save Manual Teams + Schedule</button>
                </div>

                <div className="manualGrid">
                  {Array.from({ length: Number(manual.teamCount) || 0 }, (_, i) => (
                    <div className="card" key={i}>
                      <h3>{teamColors[i % teamColors.length][1]} {teamColors[i % teamColors.length][0]}</h3>
                      {players.map((p) => (
                        <label className="checkrow" key={p.id}>
                          <input
                            type="radio"
                            name={`assign-${p.id}`}
                            checked={Number(manual.assignments[p.id]) === i}
                            onChange={() => setManualAssign(p.id, i)}
                          />
                          {p.name}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h2>Current Teams</h2>
            {teams.map((t) => (
              <div className="card" key={t.id} style={{ borderLeft: `5px solid ${t.color}` }}>
                <h3>{t.emoji} {t.name}</h3>
                <p>{playersForTeam(t.id).map((p) => p.name).join(', ')}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'matches' && (
          <div className="card">
            <h2>Matches & Scores</h2>
            <p className="muted">
              Use the team dropdowns, search by player, or continue using the full match list.
              Every view edits the same individual game scores.
            </p>

            <div className="scoreToolsGrid">
              <div className="card scoreToolCard">
                <h3>Quick Entry by Teams</h3>
                <p className="muted">Choose two teams to open their scheduled matchup.</p>

                <div className="row">
                  <label>
                    Team 1
                    <select
                      value={quickTeam1Id}
                      onChange={(event) => setQuickTeam1Id(event.target.value)}
                    >
                      <option value="">Select Team 1</option>
                      {teams.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.emoji} {item.name} — {teamMembersText(item.id)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Team 2
                    <select
                      value={quickTeam2Id}
                      onChange={(event) => setQuickTeam2Id(event.target.value)}
                    >
                      <option value="">Select Team 2</option>
                      {teams.map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                          disabled={item.id === quickTeam1Id}
                        >
                          {item.emoji} {item.name} — {teamMembersText(item.id)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {quickTeam1Id && quickTeam2Id && quickTeam1Id === quickTeam2Id && (
                  <div className="emptyState">Choose two different teams.</div>
                )}

                {quickTeam1Id && quickTeam2Id && quickTeam1Id !== quickTeam2Id && !quickSelectedMatch && (
                  <div className="emptyState">No scheduled matchup was found for these teams.</div>
                )}

                {quickSelectedMatch && (
                  <div className="quickMatchPanel">
                    <div className="row quickMatchHeader">
                      <div>
                        <b>
                          Slot {quickSelectedMatch.slot} · Court {quickSelectedMatch.court}
                        </b>
                        <div className="muted">
                          {team(quickSelectedMatch.team1_id)?.name} vs {team(quickSelectedMatch.team2_id)?.name}
                        </div>
                      </div>
                      <button
                        className="btn danger"
                        onClick={() => resetMatchScores(quickSelectedMatch.id)}
                      >
                        Reset Match Scores
                      </button>
                    </div>

                    <div className="teamVsBlock">
                      <TeamLabel teamId={quickSelectedMatch.team1_id} />
                      <div className="scoreBig">VS</div>
                      <TeamLabel teamId={quickSelectedMatch.team2_id} />
                    </div>

                    {games
                      .filter((game) => game.match_id === quickSelectedMatch.id)
                      .sort((a, b) => a.game_number - b.game_number)
                      .map((game) => renderGameScoreEditor(game))}
                  </div>
                )}
              </div>

              <div className="card scoreToolCard">
                <h3>Find Games by Player</h3>
                <p className="muted">
                  Enter a player name to view and edit every game they played this week.
                </p>

                <input
                  type="search"
                  list="week-player-names"
                  value={playerGameSearch}
                  onChange={(event) => setPlayerGameSearch(event.target.value)}
                  placeholder="Search player name"
                />
                <datalist id="week-player-names">
                  {players.map((player) => (
                    <option key={player.id} value={player.name} />
                  ))}
                </datalist>

                {playerGameSearch.trim() && !searchedPlayerMatches.length && (
                  <div className="emptyState">No player was found in this week.</div>
                )}

                {!!searchedPlayerMatches.length && (
                  <div className="searchSummary">
                    <b>
                      {searchedPlayerGames.length} game{searchedPlayerGames.length === 1 ? '' : 's'} found
                    </b>
                    <span className="muted">
                      Matching: {searchedPlayerMatches.map((player) => player.name).join(', ')}
                    </span>
                  </div>
                )}

                {!!searchedPlayerMatches.length && !searchedPlayerGames.length && (
                  <div className="emptyState">This player has no scheduled games in this week.</div>
                )}

                <div className="playerGameResults">
                  {searchedPlayerGames.map((game) => renderGameScoreEditor(game, true))}
                </div>
              </div>
            </div>

            <div className="sectionDivider" />

            <h2>Full Match Schedule</h2>
            <p className="muted">The original individual-game score entry remains available below.</p>

            {matches.map((match) => (
              <div className="card" key={match.id}>
                <div className="row">
                  <h3>
                    Slot {match.slot} · Court {match.court} · {team(match.team1_id)?.name} vs {team(match.team2_id)?.name}
                  </h3>
                  <button className="btn danger" onClick={() => resetMatchScores(match.id)}>
                    Reset Match Scores
                  </button>
                </div>

                <div className="teamVsBlock">
                  <TeamLabel teamId={match.team1_id} />
                  <div className="scoreBig">VS</div>
                  <TeamLabel teamId={match.team2_id} />
                </div>

                {games
                  .filter((game) => game.match_id === match.id)
                  .sort((a, b) => a.game_number - b.game_number)
                  .map((game) => renderGameScoreEditor(game))}
              </div>
            ))}
          </div>
        )}


        {tab === 'costs' && (
          <div className="card">
            <h2>Weekly Cost Management</h2>
            <div className="fireline" />
            <p className="muted">
              Enter the birdie cost, number of birdies used, court booking cost, and player count.
              Player count defaults to the number of players added for this week.
            </p>

            <div className="grid stats">
              <div className="card stat"><div><span className="muted">Birdie Total</span><b>${costSummary.birdieTotal.toFixed(2)}</b></div></div>
              <div className="card stat"><div><span className="muted">Court Cost</span><b>${costSummary.courtCost.toFixed(2)}</b></div></div>
              <div className="card stat"><div><span className="muted">Overall Cost</span><b>${costSummary.total.toFixed(2)}</b></div></div>
              <div className="card stat"><div><span className="muted">Cost Per Person</span><b>${costSummary.perPerson.toFixed(2)}</b></div></div>
            </div>

            <div className="card">
              <div className="row">
                <label>Cost per birdie
                  <input type="text" inputMode="decimal" value={weekCost?.cost_per_birdie ?? ''} onChange={(e) => updateCostDraft('cost_per_birdie', e.target.value)} placeholder="e.g. 3.50" />
                </label>
                <label>Number of birdies
                  <input type="text" inputMode="decimal" value={weekCost?.birdie_count ?? ''} onChange={(e) => updateCostDraft('birdie_count', e.target.value)} placeholder="e.g. 12" />
                </label>
              </div>

              <div className="row" style={{ marginTop: 12 }}>
                <label>Court booking cost
                  <input type="text" inputMode="decimal" value={weekCost?.court_booking_cost ?? ''} onChange={(e) => updateCostDraft('court_booking_cost', e.target.value)} placeholder="e.g. 160" />
                </label>
                <label>Number of players
                  <input type="text" inputMode="numeric" value={weekCost?.player_count_override ?? ''} onChange={(e) => updateCostDraft('player_count_override', e.target.value)} placeholder={`Default: ${players.length}`} />
                </label>
              </div>

              <div className="row" style={{ marginTop: 16 }}>
                <button className="btn green" onClick={saveWeekCost}>Save Cost Details</button>
                <button className="btn secondary" onClick={clearWeekCost}>Clear Cost Details</button>
              </div>
            </div>

            <div className="card">
              <h3>Formula</h3>
              <p className="muted">((Cost per birdie × Number of birdies) + Court booking cost) ÷ Number of players</p>
              <h2>
                (${costSummary.costPerBirdie.toFixed(2)} × {costSummary.birdieCount}) + ${costSummary.courtCost.toFixed(2)}
                {' '}÷ {costSummary.playerCount || 0}
                {' '}= ${costSummary.perPerson.toFixed(2)} per person
              </h2>
            </div>
          </div>
        )}


        {tab === 'team' && <Standings rows={teamStandings} type="team" />}
        {tab === 'playersStand' && <Standings rows={playerStandings} type="player" />}


        {tab === 'overall' && (
          <div className="card">
            <h2>Overall League Standings</h2>
            <div className="fireline" />
            <p className="muted">
              Calculates all completed games across every week in {league?.name || 'this league'}.
              {overallCalculatedAt ? ` Last calculated: ${new Date(overallCalculatedAt).toLocaleString()}` : ' Not calculated yet.'}
            </p>

            <div className="row" style={{ marginBottom: 16 }}>
              <button className="btn" onClick={calculateOverallLeaderboard}>Calculate Leaderboard</button>
              <button className="btn secondary" onClick={undoOverallLeaderboard}>Undo Overall Leaderboard</button>
              <button className="btn danger" onClick={clearOverallLeaderboard}>Clear Leaderboard</button>
            </div>

            <Standings rows={overallRows} type="player" />
          </div>
        )}

        {tab === 'settings' && (
          <div className="card">
            <h2>Settings</h2>
            <div className="row">
              <button className="btn" onClick={newLeague}>Create League</button>
              <button className="btn danger" onClick={deleteLeague}>Delete League</button>
              <button className="btn" onClick={newWeek}>Create Week</button>
              <button className="btn secondary" onClick={renameWeek}>Edit Week Name</button>
              <button className="btn danger" onClick={deleteWeek}>Delete Week</button>
            </div>

            <div className="row">
              <button className="btn secondary" onClick={undo}>Undo Last Score</button>
              <button className="btn secondary" onClick={() => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([JSON.stringify({ leagues, weeks, players, teams, teamPlayers, matches, games, scores }, null, 2)], { type: 'application/json' }));
                a.download = 'freakn-fethrs-export.json';
                a.click();
              }}><Download size={16} /> Export Snapshot</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Standings({ rows, type }) {
  return (
    <div className="card">
      <h2>Standings</h2>
      <div className="fireline" />

      {type === 'team' ? (
        <table>
          <thead>
            <tr><th>Rank</th><th>Team</th><th>MW</th><th>GW</th><th>PF</th><th>PA</th><th>Diff</th></tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={s.team.id}>
                <td>{i + 1}</td>
                <td>
                    <div className="pill" style={{ background: `${s.team.color}33`, color: s.team.color }}>
                      {s.team.emoji} {s.team.name}
                    </div>
                    <div className="teamMembers">{s.team.playersText || 'No players assigned'}</div>
                  </td>
                <td>{s.matchWins}</td>
                <td>{s.gameWins}</td>
                <td>{s.pointsFor}</td>
                <td>{s.pointsAgainst}</td>
                <td className={s.pointDiff >= 0 ? 'diffpos' : 'diffneg'}>{s.pointDiff > 0 ? '+' : ''}{s.pointDiff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table>
          <thead>
            <tr><th>Rank</th><th>Player</th><th>Played</th><th>Wins</th><th>Losses</th><th>PF</th><th>PA</th><th>Diff</th><th>Win %</th></tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={s.id}>
                <td>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                <td><b>{s.player}</b></td>
                <td>{s.played}</td>
                <td>{s.wins}</td>
                <td>{s.losses}</td>
                <td>{s.pointsFor}</td>
                <td>{s.pointsAgainst}</td>
                <td className={s.pointDiff >= 0 ? 'diffpos' : 'diffneg'}>{s.pointDiff > 0 ? '+' : ''}{s.pointDiff}</td>
                <td>{s.winPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
