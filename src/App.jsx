import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  : null;

const uid = () => Math.random().toString(36).slice(2, 10);
const colors = [
  ['Red','🔴','#ef4444'], ['Blue','🔵','#38bdf8'], ['Green','🟢','#22c55e'], ['Yellow','🟡','#facc15'],
  ['Orange','🟠','#fb923c'], ['Purple','🟣','#a78bfa']
];

const defaultState = {
  currentWeekId: 'week-1',
  weeks: [{
    id: 'week-1',
    name: 'Week 1',
    players: ['Arjun','Praveen','Nattu','Chandru','Shashank','Anto','Ron','Senthil'],
    teams: [],
    matches: [],
    scores: {}
  }]
};

function getWeek(state){ return state.weeks.find(w => w.id === state.currentWeekId) || state.weeks[0]; }
function getTeam(week, id){ return week.teams.find(t => t.id === id); }

function pairsForTeam(players){
  if(players.length < 2) return [];
  const pairs = [];
  for(let i=0;i<players.length;i++) for(let j=i+1;j<players.length;j++) pairs.push([players[i], players[j]]);
  return pairs.length ? pairs : [players.slice(0,2)];
}

function generateRoundRobinMatches(teams){
  const matches = [];
  let slot = 1, courtIndex = 0;
  for(let i=0;i<teams.length;i++){
    for(let j=i+1;j<teams.length;j++){
      const t1 = teams[i], t2 = teams[j];
      const p1 = pairsForTeam(t1.players), p2 = pairsForTeam(t2.players);
      matches.push({
        id: uid(), slot, court: courtIndex % 2 === 0 ? 'A' : 'B',
        team1Id: t1.id, team2Id: t2.id,
        games: [0,1,2].map(n => ({ t1: p1[n % p1.length], t2: p2[n % p2.length] }))
      });
      courtIndex++;
      if(courtIndex % 2 === 0) slot++;
    }
  }
  return matches;
}

function computePlayerStandings(week){
  const stats = {};
  week.players.forEach(p => stats[p] = { player:p, played:0, wins:0, losses:0, pointsFor:0, pointsAgainst:0, pointDiff:0 });
  week.matches.forEach(m => {
    const ms = week.scores[m.id] || {};
    m.games.forEach((g, idx) => {
      const s = ms[idx] || {};
      const a = Number(s.s1), b = Number(s.s2);
      if(Number.isFinite(a) && Number.isFinite(b) && (s.s1 !== '' && s.s2 !== '')){
        g.t1.forEach(p => { if(stats[p]){ stats[p].played++; stats[p].pointsFor += a; stats[p].pointsAgainst += b; if(a>b) stats[p].wins++; else if(b>a) stats[p].losses++; }});
        g.t2.forEach(p => { if(stats[p]){ stats[p].played++; stats[p].pointsFor += b; stats[p].pointsAgainst += a; if(b>a) stats[p].wins++; else if(a>b) stats[p].losses++; }});
      }
    });
  });
  return Object.values(stats).map(s => ({...s, pointDiff:s.pointsFor-s.pointsAgainst, winPct:s.played?Math.round((s.wins/s.played)*100):0}))
    .sort((a,b)=> b.wins-a.wins || b.pointDiff-a.pointDiff || b.pointsFor-a.pointsFor || a.player.localeCompare(b.player));
}

function computeTeamStandings(week){
  const st = {};
  week.teams.forEach(t => st[t.id] = { team:t, played:0, matchWins:0, losses:0, draws:0, gameWins:0, pointsFor:0, pointsAgainst:0 });
  week.matches.forEach(m => {
    const aTeam = st[m.team1Id], bTeam = st[m.team2Id];
    if(!aTeam || !bTeam) return;
    let aw=0,bw=0,ap=0,bp=0,done=0;
    const ms = week.scores[m.id] || {};
    m.games.forEach((_, idx) => {
      const s=ms[idx]||{}; const a=Number(s.s1), b=Number(s.s2);
      if(Number.isFinite(a)&&Number.isFinite(b)&&(s.s1!==''&&s.s2!=='')){ done++; ap+=a; bp+=b; if(a>b)aw++; else if(b>a)bw++; }
    });
    aTeam.gameWins+=aw; bTeam.gameWins+=bw; aTeam.pointsFor+=ap; aTeam.pointsAgainst+=bp; bTeam.pointsFor+=bp; bTeam.pointsAgainst+=ap;
    if(done){ aTeam.played++; bTeam.played++; if(aw>bw){aTeam.matchWins++; bTeam.losses++;} else if(bw>aw){bTeam.matchWins++; aTeam.losses++;} else {aTeam.draws++; bTeam.draws++;}}
  });
  return Object.values(st).map(s=>({...s, pointDiff:s.pointsFor-s.pointsAgainst}))
    .sort((a,b)=> b.matchWins-a.matchWins || b.pointDiff-a.pointDiff || b.pointsFor-a.pointsFor);
}

export default function App(){
  const [state,setState] = useState(defaultState);
  const [tab,setTab] = useState('dashboard');
  const [playerText,setPlayerText] = useState('');
  const [saving,setSaving] = useState(false);
  const [connected,setConnected] = useState(Boolean(supabase));
  const slug = 'freakn-fethrs-main';
  const week = getWeek(state);

  useEffect(() => {
    async function init(){
      if(!supabase){ setConnected(false); return; }
      const { data: row, error } = await supabase.from('league_state').select('*').eq('slug', slug).maybeSingle();
      if(row?.data) setState(row.data);
      else await supabase.from('league_state').insert({ slug, data: defaultState });
      if(error) console.error(error);
      const ch = supabase.channel('league-live')
        .on('postgres_changes', {event:'*', schema:'public', table:'league_state'}, payload => {
          if(payload.new?.slug === slug && payload.new.data) setState(payload.new.data);
        }).subscribe();
      return () => supabase.removeChannel(ch);
    }
    init();
  }, []);

  async function save(next){
    setState(next); setSaving(true);
    if(supabase){
      const { error } = await supabase.from('league_state').upsert({ slug, data: next }, { onConflict:'slug' });
      if(error) alert('Save failed: ' + error.message);
    }
    setTimeout(()=>setSaving(false),700);
  }
  function updateWeek(patch){
    save({...state, weeks: state.weeks.map(w => w.id===week.id ? {...w,...patch} : w)});
  }
  function addPlayers(){
    const names = playerText.split('\n').map(x=>x.trim()).filter(Boolean);
    const merged = Array.from(new Set([...week.players, ...names]));
    updateWeek({ players: merged, teams: [], matches: [], scores: {} });
    setPlayerText('');
  }
  function removePlayer(p){
    if(!confirm(`Remove ${p}? Teams and matches will reset.`)) return;
    updateWeek({ players: week.players.filter(x=>x!==p), teams: [], matches: [], scores: {} });
  }
  function randomTeams(){
    const count = Number(prompt('Number of teams?', Math.max(2, Math.ceil(week.players.length/3))) || 4);
    const shuffled=[...week.players].sort(()=>Math.random()-.5);
    const teams=Array.from({length:count},(_,i)=>({id:uid(), name:colors[i%colors.length][0], emoji:colors[i%colors.length][1], color:colors[i%colors.length][2], players:[]}));
    shuffled.forEach((p,i)=>teams[i%count].players.push(p));
    updateWeek({ teams, matches: generateRoundRobinMatches(teams), scores: {} });
  }
  function renameTeam(id,name){ updateWeek({teams:week.teams.map(t=>t.id===id?{...t,name}:t), matches:week.matches}); }
  function setScore(matchId, gameIndex, side, value){
    updateWeek({ scores: {...week.scores, [matchId]: {...(week.scores[matchId]||{}), [gameIndex]: {...((week.scores[matchId]||{})[gameIndex]||{}), [side]: value}}}});
  }
  function newWeek(){
    const name = prompt('New week name?', `Week ${state.weeks.length+1}`);
    if(!name) return;
    const nw = { id:uid(), name, players:[...week.players], teams:[], matches:[], scores:{} };
    save({...state, currentWeekId:nw.id, weeks:[...state.weeks, nw]});
  }
  function resetWeek(){
    if(confirm('Reset teams, matches, and scores for this week?')) updateWeek({teams:[],matches:[],scores:{}});
  }
  const playerStandings = useMemo(()=>computePlayerStandings(week),[week]);
  const teamStandings = useMemo(()=>computeTeamStandings(week),[week]);
  const completedGames = week.matches.reduce((a,m)=>a+m.games.filter((_,i)=>{const s=(week.scores[m.id]||{})[i]||{}; return s.s1!==undefined&&s.s1!==''&&s.s2!==undefined&&s.s2!==''}).length,0);
  const totalGames = week.matches.reduce((a,m)=>a+m.games.length,0);

  const nav = [['dashboard','Dashboard'],['players','Players'],['teams','Teams'],['matches','Matches'],['teamStandings','Team Standings'],['playerStandings','Player Standings'],['settings','Weeks / Settings']];

  return <div className="app">
    <aside className="sidebar">
      <div className="logo">FREAKN<br/><span>FETHRS</span></div>
      <div className="muted" style={{marginTop:8}}>Badminton League</div>
      <div className="nav">{nav.map(([k,l])=><button key={k} className={tab===k?'active':''} onClick={()=>setTab(k)}>{l}</button>)}</div>
      <div className="card" style={{marginTop:24}}><b>{connected?'LIVE SYNC ON':'NO SUPABASE'}</b><div className="muted">{saving?'Saving...':'Ready'}</div></div>
    </aside>

    <main className="main">
      <div className="header">
        <div><h1>{tab.replace(/([A-Z])/g,' $1')}</h1><div className="muted">Current week: {week.name}</div></div>
        <div className="row" style={{maxWidth:420}}>
          <select value={week.id} onChange={e=>save({...state,currentWeekId:e.target.value})}>{state.weeks.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select>
          <button className="btn" onClick={newWeek}>New Week</button>
        </div>
      </div>

      {tab==='dashboard' && <>
        <div className="grid stats">
          <div className="card stat"><span className="muted">Players</span><b>{week.players.length}</b></div>
          <div className="card stat"><span className="muted">Teams</span><b>{week.teams.length}</b></div>
          <div className="card stat"><span className="muted">Matches</span><b>{week.matches.length}</b></div>
          <div className="card stat"><span className="muted">Games Complete</span><b>{completedGames}/{totalGames}</b></div>
          <div className="card stat"><span className="muted">Leader</span><b>{playerStandings[0]?.player || '-'}</b></div>
        </div>
        <div className="card"><h2>Quick Actions</h2><div className="row"><button className="btn" onClick={()=>setTab('players')}>Manage Players</button><button className="btn" onClick={randomTeams}>Random Teams</button><button className="btn" onClick={()=>setTab('matches')}>Enter Scores</button></div></div>
      </>}

      {tab==='players' && <div className="card"><h2>Players</h2><textarea value={playerText} onChange={e=>setPlayerText(e.target.value)} placeholder="Paste player names, one per line"></textarea><div className="row" style={{marginTop:10}}><button className="btn" onClick={addPlayers}>Add / Import Players</button></div><table><tbody>{week.players.map(p=><tr key={p}><td>{p}</td><td style={{width:120}}><button className="btn danger" onClick={()=>removePlayer(p)}>Remove</button></td></tr>)}</tbody></table></div>}

      {tab==='teams' && <div className="card"><h2>Teams</h2><button className="btn" onClick={randomTeams}>Generate Random Teams + Schedule</button>{week.teams.map(t=><div className="card team" key={t.id} style={{borderLeftColor:t.color}}><div className="row"><input value={t.name} onChange={e=>renameTeam(t.id,e.target.value)} /><div className="badge">{t.emoji} {t.players.length} players</div></div><p>{t.players.join(', ')}</p></div>)}</div>}

      {tab==='matches' && <div className="card"><h2>Matches & Scores</h2>{week.matches.length===0?<p className="muted">Generate teams first.</p>:week.matches.map(m=>{const t1=getTeam(week,m.team1Id), t2=getTeam(week,m.team2Id); return <div className="card" key={m.id}><h3>Slot {m.slot} · Court {m.court} · {t1?.name} vs {t2?.name}</h3>{m.games.map((g,i)=>{const s=(week.scores[m.id]||{})[i]||{};return <div className="game" key={i}><div>{g.t1.join(' / ')}</div><input className="score" type="number" value={s.s1??''} onChange={e=>setScore(m.id,i,'s1',e.target.value)} /><input className="score" type="number" value={s.s2??''} onChange={e=>setScore(m.id,i,'s2',e.target.value)} /><div>{g.t2.join(' / ')}</div></div>})}</div>})}</div>}

      {tab==='teamStandings' && <div className="card"><h2>Team Standings</h2><table><thead><tr><th>Rank</th><th>Team</th><th>MW</th><th>GW</th><th>PF</th><th>PA</th><th>Diff</th></tr></thead><tbody>{teamStandings.map((s,i)=><tr key={s.team.id}><td>{i+1}</td><td>{s.team.emoji} {s.team.name}</td><td>{s.matchWins}</td><td>{s.gameWins}</td><td>{s.pointsFor}</td><td>{s.pointsAgainst}</td><td className={s.pointDiff>=0?'diffpos':'diffneg'}>{s.pointDiff>0?'+':''}{s.pointDiff}</td></tr>)}</tbody></table></div>}

      {tab==='playerStandings' && <div className="card"><h2>Player Standings</h2><table><thead><tr><th>Rank</th><th>Player</th><th>Wins</th><th>Losses</th><th>PF</th><th>PA</th><th>Diff</th><th>Win %</th></tr></thead><tbody>{playerStandings.map((s,i)=><tr key={s.player}><td>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td><td>{s.player}</td><td>{s.wins}</td><td>{s.losses}</td><td>{s.pointsFor}</td><td>{s.pointsAgainst}</td><td className={s.pointDiff>=0?'diffpos':'diffneg'}>{s.pointDiff>0?'+':''}{s.pointDiff}</td><td>{s.winPct}%</td></tr>)}</tbody></table></div>}

      {tab==='settings' && <div className="card"><h2>Weeks / Settings</h2><div className="row"><input value={week.name} onChange={e=>updateWeek({name:e.target.value})}/><button className="btn" onClick={newWeek}>Create New Week</button><button className="btn danger" onClick={resetWeek}>Reset Current Week</button></div><p className="muted">All data is stored in Supabase and synced live to everyone using the public link.</p></div>}
    </main>
  </div>
}
