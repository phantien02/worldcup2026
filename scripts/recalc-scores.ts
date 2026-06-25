import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function recalculatePoints() {
  console.log('Fetching all finished matches...');
  const { data: matches, error: matchesErr } = await supabaseAdmin
    .from('matches')
    .select('id, home_score, away_score, status, round, winner_id, win_method, score_90_home, score_90_away, penalty_home, penalty_away')
    .eq('status', 'finished');

  if (matchesErr) {
    console.error('Error fetching matches:', matchesErr);
    return;
  }

  console.log(`Found ${matches.length} finished matches. Recalculating points...`);

  for (const match of matches) {
    const isKnockout = match.round && match.round !== 'Vòng bảng';

    console.log(`Processing Match ID: ${match.id} (Round: ${match.round})`);

    // Fetch all predictions for this match
    const { data: predictions, error: predsErr } = await supabaseAdmin
      .from('predictions')
      .select('id, user_id, prediction_result, home_score, away_score, advancing_team_id, predicted_win_method, points_earned')
      .eq('match_id', match.id);

    if (predsErr) {
      console.error(`Error fetching predictions for match ${match.id}:`, predsErr);
      continue;
    }

    if (!predictions || predictions.length === 0) {
      continue;
    }

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
          const pickRate = totalPredictions > 0 ? advancingTeamCounts[p.advancing_team_id] / totalPredictions : 0;
          if (pickRate < 0.3) {
            points += 1;
          }
        }
      } else {
        // Vòng bảng
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
            points += 1;
          }
        }
      }

      if (points !== (p.points_earned || 0)) {
        await supabaseAdmin.from('predictions').update({ points_earned: points }).eq('id', p.id);
      }
    }
  }

  console.log('Finished recalculating points for all predictions.');
  console.log('Now updating profiles total_points...');

  const { data: profiles, error: profilesErr } = await supabaseAdmin.from('profiles').select('id');
  if (profilesErr) {
    console.error('Error fetching profiles:', profilesErr);
    return;
  }

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
  }

  console.log('All user points have been updated!');
}

recalculatePoints();
