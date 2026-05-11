import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
const supabase = (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  : null;
const DEFAULT = { players: [], teams: [], results: {} };
export default function App() {
  const [data, setData] = useState(DEFAULT);
  const [newPlayer, setNewPlayer] = useState('');
  const [loading, setLoading] = useState(true);
  const slug = 'main-league';
  useEffect(() => {
    (async () => {
      if (supabase) {
        const { data: row } = await supabase.from('weeks').select('*').eq('slug', slug).maybeSingle();
        if (row) setData(row.data);
        else await supabase.from('weeks').insert({ slug, data: DEFAULT });
        const channel = supabase.channel('weeks-live').on('postgres_changes',
          { event: '*', schema: 'public', table: 'weeks' },
          payload => { if (payload.new?.slug === slug) setData(payload.new.data); }
        ).subscribe();
      }
      setLoading(false);
    })();
  }, []);
  async function save(next) {
    setData(next);
    if (supabase) await supabase.from('weeks').upsert({ slug, data: next }, { onConflict: 'slug' });
  }
  function addPlayer() {
    const name = newPlayer.trim();
    if (!name || data.players.includes(name)) return;
    setNewPlayer('');
    save({ ...data, players: [...data.players, name], results: { ...data.results, [name]: { wins: 0, pointDiff: 0 } } });
  }
  function removePlayer(name) {
    const results = { ...data.results }; delete results[name];
    save({ ...data, players: data.players.filter(p => p !== name), teams: [], results });
  }
  function generateTeams() {
    const shuffled = [...data.players].sort(() => Math.random() - 0.5);
    const numTeams = Math.min(4, Math.max(2, Math.ceil(shuffled.length / 3)));
    const teams = Array.from({ length: numTeams }, (_, i) => ({ name: `Team ${i+1}`, players: [] }));
    shuffled.forEach((p, i) => teams[i % numTeams].players.push(p));
    save({ ...data, teams });
  }
  function updateResult(player, field, value) {
    save({ ...data, results: { ...data.results, [player]: { ...data.results[player], [field]: Number(value || 0) } } });
  }
  const standings = useMemo(() => data.players.map(player => ({
    player, wins: data.results[player]?.wins || 0, pointDiff: data.results[player]?.pointDiff || 0
  })).sort((a,b) => b.wins - a.wins || b.pointDiff - a.pointDiff || a.player.localeCompare(b.player)), [data]);
  if (loading) return <div className="container"><div className="card">Loading...</div></div>;
  return <div className="container">
    <h1>🏸 Freakn Fethrs League</h1>
    <div className="small" style={{marginBottom:24}}>Real-time updates for everyone viewing this link</div>
    <div className="card">
      <h2>Players</h2>
      <div className="row"><input value={newPlayer} onChange={e=>setNewPlayer(e.target.value)} placeholder="Player name"/><button onClick={addPlayer}>Add Player</button></div>
      <div style={{marginTop:12}}>
        {data.players.map(p => <div key={p} className="row" style={{marginBottom:6}}><div style={{padding:'10px'}}>{p}</div><button onClick={()=>removePlayer(p)}>Remove</button></div>)}
      </div>
    </div>
    <div className="card">
      <h2>Teams</h2>
      <button onClick={generateTeams}>Generate Random Teams</button>
      <div style={{marginTop:12}}>{data.teams.map((t,i)=><div key={i}><strong>{t.name}</strong>: {t.players.join(', ')}</div>)}</div>
    </div>
    <div className="card">
      <h2>Results</h2>
      {data.players.map(p => <div key={p} className="row" style={{marginBottom:8}}>
        <div style={{padding:'10px'}}>{p}</div>
        <input type="number" value={data.results[p]?.wins ?? 0} onChange={e=>updateResult(p,'wins',e.target.value)} />
        <input type="number" value={data.results[p]?.pointDiff ?? 0} onChange={e=>updateResult(p,'pointDiff',e.target.value)} />
      </div>)}
    </div>
    <div className="card">
      <h2>Standings</h2>
      <table><thead><tr><th>Rank</th><th>Player</th><th>Wins</th><th>Point Diff</th></tr></thead>
      <tbody>{standings.map((s,i)=><tr key={s.player}><td>{i+1}</td><td>{s.player}</td><td>{s.wins}</td><td>{s.pointDiff}</td></tr>)}</tbody></table>
    </div>
  </div>;
}
