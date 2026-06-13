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

  // Fetch all predictions for this match
  const { data: predictions } = await supabaseAdmin
    .from('predictions')
    .select('id, user_id, prediction_result, home_score, away_score, advancing_team_id, predicted_win_method, points_earned')
    .eq('match_id', matchId);

  if (!predictions) return { success: true };

  const userPointsUpdates: Record<string, number> = {};
  const actualResult = homeScore > awayScore ? 'home_win' : homeScore === awayScore ? 'draw' : 'away_win';

  for (const p of predictions) {
    let points = 0;

    if (isKnockout && p.advancing_team_id) {
      if (p.advancing_team_id === winnerId) {
        points += 10; // Đoán đúng đội đi tiếp
        if (p.predicted_win_method === winMethod) {
          points += 5; // Đoán đúng hình thức phân định
        }
      }
    } else {
      if (p.prediction_result === actualResult) {
        points += 5; // Base points for correct result
        if (p.home_score !== null && p.away_score !== null) {
          if (p.home_score === homeScore && p.away_score === awayScore) {
            points += 3; // Bonus: Đúng tỷ số hoàn toàn
          } else if (p.home_score - p.away_score === homeScore - awayScore) {
            points += 1; // Bonus: Đúng hiệu số bàn thắng
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

  return { success: true };
}
