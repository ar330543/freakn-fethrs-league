import { useMemo, useState } from 'react';
import { computePlayerStandings } from './lib/standings';

const initialPlayers = [
  { name: 'Arjun', wins: 12, pointDiff: 48, pointsFor: 240 },
  { name: 'Praveen', wins: 10, pointDiff: 32, pointsFor: 220 },
  { name: 'Nattu', wins: 9, pointDiff: 25, pointsFor: 210 },
];

export default function App() {
  const [week, setWeek] = useState('Week 1');
  const [players] = useState(initialPlayers);
  const standings = useMemo(() => computePlayerStandings(players), [players]);

  return (
    <div className="container">
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:'4rem', margin:'0', lineHeight:0.9}}>Freakn Fethrs</h1>
          <div className="small">Badminton League Manager</div>
        </div>
        <select value={week} onChange={(e)=>setWeek(e.target.value)}>
          <option>Week 1</option>
          <option>Week 2</option>
        </select>
      </header>

      <section className="grid grid-5" style={{marginBottom:24}}>
        {[
          ['Total Players', players.length],
          ['Total Teams', 4],
          ['Total Matches', 6],
          ['Games Completed', 24],
          ['Current Leader', standings[0]?.name || '-'],
        ].map(([label, value]) => (
          <div className="card" key={label}>
            <div className="small">{label}</div>
            <h2 style={{fontSize:'2.5rem', margin:'8px 0 0'}}>{value}</h2>
          </div>
        ))}
      </section>

      <section className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{fontSize:'2.5rem', margin:0}}>Player Standings</h2>
          <button className="primary">Generate Random Teams</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Rank</th><th>Player</th><th>Wins</th><th>Point Diff</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((p, i) => (
              <tr key={p.name}>
                <td>{i + 1}</td>
                <td>{p.name}</td>
                <td>{p.wins}</td>
                <td>{p.pointDiff > 0 ? '+' : ''}{p.pointDiff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
