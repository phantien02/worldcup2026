import React from 'react';

export type TopScorer = {
  id: number;
  player_name: string;
  team: string;
  goals: number;
  assists: number;
};

type Props = {
  scorers: TopScorer[];
  matches: any[];
};

export default function TopScorers({ scorers, matches }: Props) {
  if (!scorers || scorers.length === 0) {
    return (
      <div className="glass-panel text-center" style={{ padding: '4rem 2rem', opacity: 0.6 }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚽</div>
        Chưa có dữ liệu Vua Phá Lưới.
      </div>
    );
  }

  const teamFlagMap: Record<string, string> = {};
  if (matches) {
    matches.forEach(m => {
      if (m.home_team?.name && m.home_team?.flag_url) teamFlagMap[m.home_team.name] = m.home_team.flag_url;
      if (m.away_team?.name && m.away_team?.flag_url) teamFlagMap[m.away_team.name] = m.away_team.flag_url;
    });
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ backgroundColor: 'rgba(20, 20, 28, 0.8)', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#00d2ff' }}>●</span> Bảng Xếp Hạng Vua Phá Lưới
          </h3>
          <div style={{ fontSize: '0.85rem', color: '#a0a0a0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span> Live from VTC
          </div>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#a0a0a0', fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <tr>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', width: '60px' }}>#</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Cầu thủ</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Đội tuyển</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#00ff87' }}>⚽ Bàn thắng</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#00d2ff' }}>🅰️ Kiến tạo</th>
              </tr>
            </thead>
            <tbody>
              {scorers.map((scorer, idx) => {
                const isTop3 = idx < 3;
                let rankColor = '#fbbf24';
                let rankText = '#000';
                if (idx === 0) { rankColor = '#ffd700'; } // Gold
                else if (idx === 1) { rankColor = '#c0c0c0'; } // Silver
                else if (idx === 2) { rankColor = '#cd7f32'; } // Bronze
                else { rankColor = 'rgba(255, 255, 255, 0.1)'; rankText = '#fff'; }

                return (
                  <tr key={scorer.id || idx} className="hover-card" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background-color 0.2s', backgroundColor: idx === 0 ? 'rgba(255, 215, 0, 0.05)' : 'transparent' }}>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
                      <div style={{
                        width: isTop3 ? '28px' : '24px',
                        height: isTop3 ? '28px' : '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        backgroundColor: rankColor,
                        color: rankText,
                        fontSize: isTop3 ? '0.9rem' : '0.85rem',
                        boxShadow: isTop3 ? '0 0 10px rgba(0,0,0,0.3)' : 'none'
                      }}>
                        {idx + 1}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: isTop3 ? 'bold' : '500', color: isTop3 ? '#fff' : '#e0e0e0', fontSize: isTop3 ? '1.05rem' : '0.95rem' }}>
                      {scorer.player_name}
                      {idx === 0 && <span style={{ marginLeft: '8px', fontSize: '1rem' }}>🏆</span>}
                    </td>
                    <td style={{ padding: '1rem', color: '#e5e7eb', fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {teamFlagMap[scorer.team] ? (
                          <img src={teamFlagMap[scorer.team]} alt={scorer.team} style={{ width: '24px', height: '16px', objectFit: 'cover', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        ) : (
                          <div style={{ width: '24px', height: '16px', backgroundColor: '#444', borderRadius: '2px' }}></div>
                        )}
                        <span>{scorer.team}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#00ff87' }}>
                      {scorer.goals}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '500', color: '#00d2ff' }}>
                      {scorer.assists}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
