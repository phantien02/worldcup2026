import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    console.log('Fetching all finished matches...');
    const { data: matches, error: matchesErr } = await supabaseAdmin
      .from('matches')
      .select('id, home_score, away_score, status, round, winner_id, win_method, score_90_home, score_90_away, penalty_home, penalty_away, kickoff_time')
      .eq('status', 'finished');

    if (matchesErr) throw matchesErr;
    if (!matches) return NextResponse.json({ message: 'No finished matches found' });

    let updatedPredictionsCount = 0;
    const NEW_RULE_CUTOFF = new Date('2026-06-24T17:00:00Z').getTime();

    for (const match of matches) {
      const knockoutRounds = ['Vòng 32 đội', 'Vòng 16 đội', 'Tứ kết', 'Bán kết', 'Tranh hạng 3', 'Chung kết'];
      const isKnockout = match.round && knockoutRounds.includes(match.round);
      const matchKickoffTime = match.kickoff_time ? new Date(match.kickoff_time).getTime() : 0;
      const isNewRules = matchKickoffTime >= NEW_RULE_CUTOFF;

      const { data: predictions, error: predsErr } = await supabaseAdmin
        .from('predictions')
        .select('id, user_id, prediction_result, home_score, away_score, advancing_team_id, predicted_win_method, points_earned')
        .eq('match_id', match.id);

      if (predsErr) throw predsErr;
      if (!predictions || predictions.length === 0) continue;

      const actualResult = match.home_score > match.away_score ? 'home_win' : match.home_score === match.away_score ? 'draw' : 'away_win';
      const totalPredictions = predictions.length;
      let homeWinCount = 0;
      let awayWinCount = 0;
      let drawCount = 0;
      const advancingTeamCounts: Record<string, number> = {};

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

      for (const p of predictions) {
        let points = 0;

        if (isKnockout && p.advancing_team_id) {
          if (p.advancing_team_id === match.winner_id) {
            points += 10;
            if (p.predicted_win_method === match.win_method) {
              points += 5;
            }
            if (isNewRules) {
              const pickRate = totalPredictions > 0 ? advancingTeamCounts[p.advancing_team_id] / totalPredictions : 0;
              if (pickRate < 0.3) {
                points += 10;
              }
            }
          }
        } else {
          // Vòng bảng
          if (isNewRules) {
            if (p.home_score !== null && p.home_score === match.home_score) points += 1;
            if (p.away_score !== null && p.away_score === match.away_score) points += 1;

            if (p.prediction_result === actualResult) {
              points += 5;
              if (p.home_score !== null && p.away_score !== null) {
                if (p.home_score === match.home_score && p.away_score === match.away_score) {
                  points += 3;
                } else if (p.home_score - p.away_score === match.home_score - match.away_score) {
                  points += 1;
                }
              }

              let pickRate = 0;
              if (totalPredictions > 0) {
                if (p.prediction_result === 'home_win') pickRate = homeWinCount / totalPredictions;
                else if (p.prediction_result === 'away_win') pickRate = awayWinCount / totalPredictions;
                else if (p.prediction_result === 'draw') pickRate = drawCount / totalPredictions;
              }
              
              if (pickRate < 0.2) {
                points += 5;
              }
            }
          } else {
            // LUẬT CŨ
            if (p.prediction_result === actualResult) {
              points += 5;
              if (p.home_score !== null && p.away_score !== null) {
                if (p.home_score === match.home_score && p.away_score === match.away_score) {
                  points += 3;
                } else if (p.home_score - p.away_score === match.home_score - match.away_score) {
                  points += 1;
                }
              }
            }
          }
        }

        if (points !== (p.points_earned || 0)) {
          await supabaseAdmin.from('predictions').update({ points_earned: points }).eq('id', p.id);
          updatedPredictionsCount++;
        }
      }
    }

    // Now recalculate profiles total_points
    const { data: profiles, error: profilesErr } = await supabaseAdmin.from('profiles').select('id');
    if (profilesErr) throw profilesErr;

    let updatedProfilesCount = 0;
    if (profiles) {
      for (const user of profiles) {
        const { data: predictions } = await supabaseAdmin
          .from('predictions')
          .select('points_earned')
          .eq('user_id', user.id);
          
        let total = 0;
        if (predictions) {
          total = predictions.reduce((sum, p) => sum + (p.points_earned || 0), 0);
        }
        
        await supabaseAdmin.from('profiles').update({ total_points: total }).eq('id', user.id);
        updatedProfilesCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Points recalculated successfully',
      matchesProcessed: matches.length,
      updatedPredictionsCount,
      updatedProfilesCount
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
