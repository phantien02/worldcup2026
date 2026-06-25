import React, { useMemo } from 'react';

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
    const groupTeams = Object.values(groups[groupName]);

    // Group teams by points
    const teamsByPts: Record<number, TeamStats[]> = {};
    groupTeams.forEach(t => {
      if (!teamsByPts[t.pts]) teamsByPts[t.pts] = [];
      teamsByPts[t.pts].push(t);
    });

    const ptsDescending = Object.keys(teamsByPts).map(Number).sort((a, b) => b - a);
    const sortedTeams: TeamStats[] = [];

    ptsDescending.forEach(pts => {
      const tiedTeams = teamsByPts[pts];
      
      if (tiedTeams.length <= 1) {
        sortedTeams.push(tiedTeams[0]);
      } else {
        // Resolve ties using Head-to-Head mini-league
        const tiedTeamNames = tiedTeams.map(t => t.name);
        const miniStats: Record<string, { pts: number, gd: number, gf: number }> = {};
        tiedTeamNames.forEach(name => miniStats[name] = { pts: 0, gd: 0, gf: 0 });

        matches.forEach(m => {
          if (m.status === 'finished' && m.home_score !== null && m.away_score !== null) {
            const hTeam = m.home_team?.name;
            const aTeam = m.away_team?.name;
            if (hTeam && aTeam && tiedTeamNames.includes(hTeam) && tiedTeamNames.includes(aTeam)) {
              const hScore = m.home_score;
              const aScore = m.away_score;
              
              miniStats[hTeam].gf += hScore;
              miniStats[hTeam].gd += (hScore - aScore);
              miniStats[aTeam].gf += aScore;
              miniStats[aTeam].gd += (aScore - hScore);
              
              if (hScore > aScore) miniStats[hTeam].pts += 3;
              else if (hScore < aScore) miniStats[aTeam].pts += 3;
              else {
                miniStats[hTeam].pts += 1;
                miniStats[aTeam].pts += 1;
              }
            }
          }
        });

        const resolved = [...tiedTeams].sort((a, b) => {
          // 1. Head-to-head points
          if (miniStats[a.name].pts !== miniStats[b.name].pts) return miniStats[b.name].pts - miniStats[a.name].pts;
          // 2. Head-to-head goal difference
          if (miniStats[a.name].gd !== miniStats[b.name].gd) return miniStats[b.name].gd - miniStats[a.name].gd;
          // 3. Head-to-head goals scored
          if (miniStats[a.name].gf !== miniStats[b.name].gf) return miniStats[b.name].gf - miniStats[a.name].gf;
          
          // 4. Overall goal difference
          const gdA = a.gf - a.ga;
          const gdB = b.gf - b.ga;
          if (gdA !== gdB) return gdB - gdA;
          
          // 5. Overall goals scored
          if (a.gf !== b.gf) return b.gf - a.gf;
          
          // Fallback: Alphabetical
          return a.name.localeCompare(b.name);
        });

        sortedTeams.push(...resolved);
      }
    });

    return { name: groupName, teams: sortedTeams };
  });

  if (sortedGroups.length === 0) {
    return (
      <div className="glass-panel text-center" style={{ padding: '4rem 2rem', opacity: 0.6 }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📊</div>
        Chưa có dữ liệu Bảng đấu.
      </div>
    );
  }

  const teamColors = useMemo(() => {
    const colors: Record<string, Record<string, string>> = {};
    
    const allGroupMatches = matches.filter(m => m.round?.startsWith('Bảng'));
    const isGroupStageComplete = allGroupMatches.length > 0 && allGroupMatches.every(m => m.status === 'finished');

    const thirdPlacedTeams = sortedGroups.map(g => g.teams[2]).filter(Boolean);
    const sortedThirdPlaces = [...thirdPlacedTeams].sort((a, b) => {
      if (a.pts !== b.pts) return b.pts - a.pts;
      const gdA = a.gf - a.ga; const gdB = b.gf - b.ga;
      if (gdA !== gdB) return gdB - gdA;
      if (a.gf !== b.gf) return b.gf - a.gf;
      return a.name.localeCompare(b.name);
    });
    const top8ThirdPlacesNames = sortedThirdPlaces.slice(0, 8).map(t => t.name);

    sortedGroups.forEach(group => {
      colors[group.name] = {};
      const groupMatches = matches.filter(m => m.round === group.name);
      const pendingMatches = groupMatches.filter(m => m.status !== 'finished');
      
      if (pendingMatches.length === 0) {
        group.teams.forEach((team, idx) => {
          if (idx === 0 || idx === 1) colors[group.name][team.name] = '#10b981';
          else if (idx === 3) colors[group.name][team.name] = '#ef4444';
          else {
            if (isGroupStageComplete) {
              colors[group.name][team.name] = top8ThirdPlacesNames.includes(team.name) ? '#10b981' : '#ef4444';
            } else {
              colors[group.name][team.name] = '#fbbf24';
            }
          }
        });
        return;
      }

      const scenarios: Record<string, string>[] = [];
      const pendingMatchIds = pendingMatches.map(m => m.id);
      
      const generateScenarios = (matchIdx: number, currentOutcomes: Record<string, string>) => {
        if (matchIdx === pendingMatches.length) {
          scenarios.push(currentOutcomes);
          return;
        }
        const match = pendingMatches[matchIdx];
        if (!match.home_team?.name || !match.away_team?.name) {
          generateScenarios(matchIdx + 1, currentOutcomes);
          return;
        }
        
        generateScenarios(matchIdx + 1, { ...currentOutcomes, [match.id]: '1' });
        generateScenarios(matchIdx + 1, { ...currentOutcomes, [match.id]: 'X' });
        generateScenarios(matchIdx + 1, { ...currentOutcomes, [match.id]: '2' });
      };
      
      generateScenarios(0, {});

      const canYBeatX = (Y: string, X: string, tiedTeams: string[], scenarioOutcomes: Record<string, string>) => {
        const ml_pts: Record<string, number> = {};
        const ml_gd: Record<string, number> = {};
        const ml_gf: Record<string, number> = {};
        let allMlFinished = true;
        
        tiedTeams.forEach(t => { ml_pts[t] = 0; ml_gd[t] = 0; ml_gf[t] = 0; });
        
        for (let i = 0; i < tiedTeams.length; i++) {
          for (let j = i + 1; j < tiedTeams.length; j++) {
            const t1 = tiedTeams[i];
            const t2 = tiedTeams[j];
            
            const m = groupMatches.find(match => 
              (match.home_team?.name === t1 && match.away_team?.name === t2) ||
              (match.home_team?.name === t2 && match.away_team?.name === t1)
            );
            if (!m) continue;
            
            const h = m.home_team!.name;
            const a = m.away_team!.name;
            
            if (m.status === 'finished') {
              const hScore = m.home_score!;
              const aScore = m.away_score!;
              ml_gd[h] += (hScore - aScore);
              ml_gd[a] += (aScore - hScore);
              ml_gf[h] += hScore;
              ml_gf[a] += aScore;
              if (hScore > aScore) ml_pts[h] += 3;
              else if (hScore < aScore) ml_pts[a] += 3;
              else { ml_pts[h] += 1; ml_pts[a] += 1; }
            } else {
              allMlFinished = false;
              const outcome = scenarioOutcomes[m.id];
              if (outcome === '1') ml_pts[h] += 3;
              else if (outcome === '2') ml_pts[a] += 3;
              else { ml_pts[h] += 1; ml_pts[a] += 1; }
            }
          }
        }
        
        if (ml_pts[Y] > ml_pts[X]) return true;
        if (ml_pts[Y] < ml_pts[X]) return false;
        
        if (allMlFinished) {
          if (ml_gd[Y] > ml_gd[X]) return true;
          if (ml_gd[Y] < ml_gd[X]) return false;
          if (ml_gf[Y] > ml_gf[X]) return true;
          if (ml_gf[Y] < ml_gf[X]) return false;
        }
        return true; 
      };

      group.teams.forEach((team) => {
        let bestRank = 4;
        let worstRank = 1;
        
        scenarios.forEach(outcomes => {
          const pts: Record<string, number> = {};
          group.teams.forEach(t => pts[t.name] = t.pts);
          
          pendingMatches.forEach(m => {
            const h = m.home_team!.name;
            const a = m.away_team!.name;
            const outcome = outcomes[m.id];
            if (outcome === '1') pts[h] += 3;
            else if (outcome === '2') pts[a] += 3;
            else { pts[h] += 1; pts[a] += 1; }
          });
          
          let teamsWithMore = 0;
          let teamsWithMoreOrEqual = 0;
          
          const tiedTeams = group.teams.map(t => t.name).filter(tName => pts[tName] === pts[team.name]);
          
          group.teams.forEach(other => {
            if (other.name !== team.name) {
              if (pts[other.name] > pts[team.name]) {
                teamsWithMore++;
                teamsWithMoreOrEqual++;
              } else if (pts[other.name] === pts[team.name]) {
                const yCouldBeatX = canYBeatX(other.name, team.name, tiedTeams, outcomes);
                const xCouldBeatY = canYBeatX(team.name, other.name, tiedTeams, outcomes);
                
                if (yCouldBeatX && !xCouldBeatY) {
                   teamsWithMore++;
                   teamsWithMoreOrEqual++;
                } else if (!yCouldBeatX && xCouldBeatY) {
                   // Y definitively loses to X
                } else {
                   teamsWithMoreOrEqual++;
                }
              }
            }
          });
          
          const rankIfWinTiebreakers = teamsWithMore + 1;
          const rankIfLoseTiebreakers = teamsWithMoreOrEqual + 1;
          
          if (rankIfWinTiebreakers < bestRank) bestRank = rankIfWinTiebreakers;
          if (rankIfLoseTiebreakers > worstRank) worstRank = rankIfLoseTiebreakers;
        });
        
        if (worstRank <= 2) colors[group.name][team.name] = '#10b981';
        else if (bestRank >= 4) colors[group.name][team.name] = '#ef4444';
        else colors[group.name][team.name] = '#fbbf24';
      });
    });
    
    return colors;
  }, [matches, sortedGroups]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.4s ease-out' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ color: '#00d2ff' }}>●</span> BXH World Cup 2026
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '2.5rem' }}>
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
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'bold' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                          backgroundColor: teamColors[group.name]?.[team.name] || '#fbbf24',
                          color: teamColors[group.name]?.[team.name] === '#fbbf24' ? '#000' : '#fff',
                          fontSize: '0.85rem'
                        }}>
                          {idx + 1}
                        </div>
                      </td>
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
