import React from 'react';

type TeamStats = {
  name: string;
  flag_url?: string;
  p: number; // Played
  w: number; // Won
  d: number; // Drawn
  l: number; // Lost
  gf: number; // Goals For
  ga: number; // Goals Against
  pts: number; // Points
};

type Group = {
  name: string;
  teams: TeamStats[];
};

export default function WorldCupStandings({ matches }: { matches: any[] }) {
  // Calculate standings
  const groups: Record<string, Record<string, TeamStats>> = {};
  
  matches.forEach(m => {
    if (!m.round || !m.round.startsWith('Bảng')) return;
    
    if (!groups[m.round]) groups[m.round] = {};
    const group = groups[m.round];
    
    const hTeam = m.home_team?.name;
    const aTeam = m.away_team?.name;
    
    if (!hTeam || !aTeam) return; // Skip if teams are not defined
    
    if (!group[hTeam]) group[hTeam] = { name: hTeam, flag_url: m.home_team?.flag_url, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    if (!group[aTeam]) group[aTeam] = { name: aTeam, flag_url: m.away_team?.flag_url, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    
    if (m.status === 'finished' && m.home_score !== null && m.away_score !== null) {
      group[hTeam].p += 1;
      group[aTeam].p += 1;
      
      group[hTeam].gf += m.home_score;
      group[hTeam].ga += m.away_score;
      
      group[aTeam].gf += m.away_score;
      group[aTeam].ga += m.home_score;
      
      if (m.home_score > m.away_score) {
        group[hTeam].w += 1;
        group[hTeam].pts += 3;
        group[aTeam].l += 1;
      } else if (m.home_score < m.away_score) {
        group[aTeam].w += 1;
        group[aTeam].pts += 3;
        group[hTeam].l += 1;
      } else {
        group[hTeam].d += 1;
        group[aTeam].d += 1;
        group[hTeam].pts += 1;
        group[aTeam].pts += 1;
      }
    }
  });

  const sortedGroups = Object.keys(groups).sort().map(groupName => {
    const teams = Object.values(groups[groupName]).sort((a, b) => {
      if (a.pts !== b.pts) return b.pts - a.pts;
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (gdA !== gdB) return gdB - gdA;
      return b.gf - a.gf;
    });
    return { name: groupName, teams };
  });

  if (sortedGroups.length === 0) {
    return (
      <div className="glass-panel text-center" style={{ padding: '4rem 2rem', opacity: 0.6 }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📊</div>
        Chưa có dữ liệu Bảng đấu.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.4s ease-out' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ color: '#00d2ff' }}>●</span> BXH World Cup 2026
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {sortedGroups.map(group => (
          <div key={group.name} className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ backgroundColor: 'rgba(20, 20, 28, 0.8)', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                {group.name}
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                <thead style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#a0a0a0', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'bold' }}>#</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>Đội</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold' }} title="Số trận">T</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold' }} title="Thắng">T</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold' }} title="Hòa">H</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold' }} title="Thua">B</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold' }} title="Hiệu số">HS</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'bold', color: '#fff' }}>Điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {group.teams.map((team, idx) => (
                    <tr key={team.name} className="hover-card" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background-color 0.2s' }}>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'bold', color: '#a0a0a0' }}>{idx + 1}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {team.flag_url ? (
                          <img src={team.flag_url} alt={team.name} style={{ width: '28px', height: '20px', objectFit: 'cover', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        ) : (
                          <div style={{ width: '28px', height: '20px', backgroundColor: '#444', borderRadius: '2px' }}></div>
                        )}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>{team.name}</span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#d0d0d0' }}>{team.p}</td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#d0d0d0' }}>{team.w}</td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#d0d0d0' }}>{team.d}</td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#d0d0d0' }}>{team.l}</td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#d0d0d0' }}>{team.gf - team.ga > 0 ? `+${team.gf - team.ga}` : team.gf - team.ga}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'bold', color: '#fff', fontSize: '1rem' }}>{team.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
