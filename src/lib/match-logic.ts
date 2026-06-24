import { supabaseAdmin } from '@/lib/supabase-server';

export async function internalUpdateMatchResult(
  matchId: string, 
  homeScore: number, 
  awayScore: number,
  isKnockout: boolean = false,
  winnerId?: string,
  winMethod?: '90_mins' | 'extra_time' | 'penalties',
  score90Home?: number,
  score90Away?: number,
  penaltyHome?: number,
  penaltyAway?: number,
  events?: any
) {
  // Update match status
  const updateData: any = {
    home_score: homeScore,
    away_score: awayScore,
    status: 'finished'
  };
  
  if (events) {
    updateData.events = events;
  }

  if (isKnockout) {
    updateData.winner_id = winnerId;
    updateData.win_method = winMethod;
    if (winMethod !== '90_mins') {
      updateData.score_90_home = score90Home;
      updateData.score_90_away = score90Away;
    }
    if (winMethod === 'penalties') {
      updateData.penalty_home = penaltyHome;
      updateData.penalty_away = penaltyAway;
    }
  }

  const { error: matchError } = await supabaseAdmin.from('matches').update(updateData).eq('id', matchId);

  if (matchError) throw matchError;

  // Fetch match to get kickoff_time for rule versioning
  const { data: matchData } = await supabaseAdmin.from('matches').select('kickoff_time').eq('id', matchId).single();
  const isNewRules = matchData?.kickoff_time ? new Date(matchData.kickoff_time).getTime() >= new Date('2026-06-24T17:00:00Z').getTime() : true;

  // Fetch all predictions for this match
  const { data: predictions } = await supabaseAdmin
    .from('predictions')
    .select('id, user_id, prediction_result, home_score, away_score, advancing_team_id, predicted_win_method, points_earned')
    .eq('match_id', matchId);

  if (!predictions) return { success: true };

  const userPointsUpdates: Record<string, number> = {};
  const actualResult = homeScore > awayScore ? 'home_win' : homeScore === awayScore ? 'draw' : 'away_win';

  const totalPredictions = predictions.length;
  let homeWinCount = 0;
  let awayWinCount = 0;
  let drawCount = 0;
  const advancingTeamCounts: Record<number, number> = {};

  if (totalPredictions > 0) {
    for (const p of predictions) {
      if (isKnockout) {
        if (p.advancing_team_id) {
          advancingTeamCounts[p.advancing_team_id] = (advancingTeamCounts[p.advancing_team_id] || 0) + 1;
        }
      } else {
        if (p.prediction_result === 'home_win') homeWinCount++;
        else if (p.prediction_result === 'away_win') awayWinCount++;
        else if (p.prediction_result === 'draw') drawCount++;
      }
    }
  }

  for (const p of predictions) {
    let points = 0;

    if (isKnockout && p.advancing_team_id) {
      if (p.advancing_team_id === winnerId) {
        points += 10; // Đoán đúng đội đi tiếp
        if (p.predicted_win_method === winMethod) {
          points += 5; // Đoán đúng hình thức phân định
        }

        if (isNewRules) {
          // Điểm mạo hiểm Knockout (< 30%)
          const pickRate = totalPredictions > 0 ? advancingTeamCounts[p.advancing_team_id] / totalPredictions : 0;
          if (pickRate < 0.3) {
            points += 10;
          }
        }
      }
    } else {
      // Vòng Bảng
      if (isNewRules) {
        // 1. Điểm dự đoán phụ độc lập (Đúng tỷ số nhà/khách)
        if (p.home_score !== null && p.home_score === homeScore) points += 1;
        if (p.away_score !== null && p.away_score === awayScore) points += 1;

        // 2. Điểm cơ bản và Điểm thưởng
        if (p.prediction_result === actualResult) {
          points += 5; // Điểm cơ bản: Đúng kết quả
          
          if (p.home_score !== null && p.away_score !== null) {
            if (p.home_score === homeScore && p.away_score === awayScore) {
              points += 3; // Thưởng: Đúng phóc tỷ số
            } else if (p.home_score - p.away_score === homeScore - awayScore) {
              points += 1; // Thưởng: Đúng hiệu số bàn thắng
            }
          }

          // 3. Điểm mạo hiểm Vòng bảng (< 30%)
          let pickRate = 0;
          if (totalPredictions > 0) {
            if (p.prediction_result === 'home_win') pickRate = homeWinCount / totalPredictions;
            else if (p.prediction_result === 'away_win') pickRate = awayWinCount / totalPredictions;
            else if (p.prediction_result === 'draw') pickRate = drawCount / totalPredictions;
          }
          
          if (pickRate < 0.3) {
            points += 5;
          }
        }
      } else {
        // LUẬT CŨ
        if (p.prediction_result === actualResult) {
          points += 5; // Điểm cơ bản: Đúng kết quả
          
          if (p.home_score !== null && p.away_score !== null) {
            if (p.home_score === homeScore && p.away_score === awayScore) {
              points += 3; // Thưởng: Đúng phóc tỷ số
            } else if (p.home_score - p.away_score === homeScore - awayScore) {
              points += 1; // Thưởng: Đúng hiệu số bàn thắng
            }
          }
        }
      }
    }

    const oldPoints = p.points_earned || 0;
    const delta = points - oldPoints;

    if (delta !== 0 || points !== oldPoints) {
      // Update prediction record
      await supabaseAdmin.from('predictions').update({ points_earned: points }).eq('id', p.id);
    }
    
    if (delta !== 0) {
      userPointsUpdates[p.user_id] = (userPointsUpdates[p.user_id] || 0) + delta;
    }
  }

  // Update total points for each user using delta
  for (const [userId, delta] of Object.entries(userPointsUpdates)) {
    if (delta !== 0) {
      const { data: profile } = await supabaseAdmin.from('profiles').select('total_points').eq('id', userId).single();
      if (profile) {
        await supabaseAdmin.from('profiles').update({ total_points: (profile.total_points || 0) + delta }).eq('id', userId);
      }
    }
  }

  // --- AUTO PROPAGATE KNOCKOUT WINNER/LOSER ---
  if (isKnockout && winnerId) {
    try {
      const { data: currentMatch } = await supabaseAdmin
        .from('matches')
        .select('home_team:home_team_id(name), away_team:away_team_id(name)')
        .eq('id', matchId)
        .single();
      
      if (currentMatch) {
        const homeName = (currentMatch.home_team as any)?.name;
        const awayName = (currentMatch.away_team as any)?.name;
        
        // Find match name like "Trận 49"
        const matchMappingJson = require('@/data/matchMapping.json');
        const matchName1 = matchMappingJson[`${homeName} vs ${awayName}`];
        const matchName2 = matchMappingJson[`${awayName} vs ${homeName}`];
        const currentMatchName = matchName1 || matchName2;
        
        if (currentMatchName) {
          // Identify loserId
          const { data: matchRaw } = await supabaseAdmin.from('matches').select('home_team_id, away_team_id').eq('id', matchId).single();
          const loserId = matchRaw?.home_team_id === winnerId ? matchRaw?.away_team_id : matchRaw?.home_team_id;

          // Placeholder names
          const winnerPlaceholderNames = [`Thắng ${currentMatchName.toLowerCase()}`, `thắng ${currentMatchName.toLowerCase()}`, `Thắng trận ${currentMatchName.replace('Trận ', '')}`];
          const loserPlaceholderNames = [`Thua ${currentMatchName.toLowerCase()}`, `thua ${currentMatchName.toLowerCase()}`, `Thua trận ${currentMatchName.replace('Trận ', '')}`];

          // Fetch placeholder teams from DB
          const { data: placeholderTeams } = await supabaseAdmin
            .from('teams')
            .select('id, name')
            .or(`name.ilike.Thắng ${currentMatchName},name.ilike.Thua ${currentMatchName}`);

          if (placeholderTeams && placeholderTeams.length > 0) {
            const winnerPlaceholderTeam = placeholderTeams.find(t => t.name.toLowerCase().includes('thắng'));
            const loserPlaceholderTeam = placeholderTeams.find(t => t.name.toLowerCase().includes('thua'));

            // Update future matches
            if (winnerPlaceholderTeam) {
              await supabaseAdmin.from('matches').update({ home_team_id: winnerId }).eq('home_team_id', winnerPlaceholderTeam.id);
              await supabaseAdmin.from('matches').update({ away_team_id: winnerId }).eq('away_team_id', winnerPlaceholderTeam.id);
            }
            if (loserPlaceholderTeam && loserId) {
              await supabaseAdmin.from('matches').update({ home_team_id: loserId }).eq('home_team_id', loserPlaceholderTeam.id);
              await supabaseAdmin.from('matches').update({ away_team_id: loserId }).eq('away_team_id', loserPlaceholderTeam.id);
            }
          }
        }
      }
    } catch (err) {
      console.error("Lỗi khi tự động tiến nhánh:", err);
    }
  }

  return { success: true };
}
