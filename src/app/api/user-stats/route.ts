import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // 1. Fetch user profile
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single();
      
    if (profileErr) throw profileErr;

    // 2. Fetch user's predictions
    const { data: predictions, error: predErr } = await supabaseAdmin
      .from('predictions')
      .select('match_id, home_score, away_score, points_earned, advancing_team_id, predicted_win_method')
      .eq('user_id', userId);
      
    if (predErr) throw predErr;

    // 3. Fetch matches details
    // We fetch all valid matches to join with predictions
    const { data: matches, error: matchErr } = await supabaseAdmin
      .from('matches')
      .select('id, home_team:home_team_id(id, name), away_team:away_team_id(id, name), home_score, away_score, status, round, kickoff_time, winner_id, win_method');
      
    if (matchErr) throw matchErr;

    const validMatches = matches.filter(m => m.round !== 'DELETED');
    const matchMap: Record<string, any> = {};
    validMatches.forEach(m => matchMap[m.id] = m);

    const NEW_RULE_CUTOFF = new Date('2026-06-24T17:00:00Z').getTime();

    // 4. Combine data
    const userStats = {
      display_name: profile?.display_name || 'Người chơi',
      matchHistory: predictions
        .map(pred => {
          const m = matchMap[pred.match_id];
          if (!m) return null;
          
          let breakdown: string[] = [];
          const knockoutRounds = ['Vòng 32 đội', 'Vòng 16 đội', 'Tứ kết', 'Bán kết', 'Tranh hạng 3', 'Chung kết'];
          const isKnockout = m.round && knockoutRounds.includes(m.round);
          const pointsEarned = pred.points_earned || 0;
          let calculatedBasePoints = 0;
          const matchKickoffTime = m.kickoff_time ? new Date(m.kickoff_time).getTime() : 0;
          const isNewRules = matchKickoffTime >= NEW_RULE_CUTOFF;

          if (isKnockout) {
             if (pred.advancing_team_id && pred.advancing_team_id === m.winner_id) {
               breakdown.push('Đúng đội đi tiếp: +10');
               calculatedBasePoints += 10;
               if (pred.predicted_win_method === m.win_method) {
                 breakdown.push('Đúng hình thức: +5');
                 calculatedBasePoints += 5;
               }
             } else if (pred.advancing_team_id && m.winner_id) {
               breakdown.push('Sai đội đi tiếp: 0');
             }
          } else {
             if (isNewRules) {
               if (m.home_score !== null && m.away_score !== null && pred.home_score !== null && pred.away_score !== null) {
                 const actualResult = m.home_score > m.away_score ? 'home' : m.home_score === m.away_score ? 'draw' : 'away';
                 const predResult = pred.home_score > pred.away_score ? 'home' : pred.home_score === pred.away_score ? 'draw' : 'away';
                 
                 if (predResult === actualResult) {
                   breakdown.push('Đúng kết quả: +5');
                   calculatedBasePoints += 5;
                   
                   if (pred.home_score === m.home_score && pred.away_score === m.away_score) {
                     breakdown.push('Đúng chính xác tỷ số: +3');
                     calculatedBasePoints += 3;
                   } else if (pred.home_score - pred.away_score === m.home_score - m.away_score) {
                     breakdown.push('Đúng hiệu số: +1');
                     calculatedBasePoints += 1;
                   }
                 } else {
                   breakdown.push('Sai kết quả: 0');
                 }
                 
                 if (pred.home_score === m.home_score) {
                   breakdown.push(`Đúng số bàn ${m.home_team?.name || 'Đội nhà'}: +1`);
                   calculatedBasePoints += 1;
                 }
                 if (pred.away_score === m.away_score) {
                   breakdown.push(`Đúng số bàn ${m.away_team?.name || 'Đội khách'}: +1`);
                   calculatedBasePoints += 1;
                 }
               }
             } else {
               // Luật Cũ
               if (m.home_score !== null && m.away_score !== null && pred.home_score !== null && pred.away_score !== null) {
                 const actualResult = m.home_score > m.away_score ? 'home' : m.home_score === m.away_score ? 'draw' : 'away';
                 const predResult = pred.home_score > pred.away_score ? 'home' : pred.home_score === pred.away_score ? 'draw' : 'away';
                 
                 if (predResult === actualResult) {
                   breakdown.push('Đúng kết quả: +5');
                   calculatedBasePoints += 5;
                   
                   if (pred.home_score === m.home_score && pred.away_score === m.away_score) {
                     breakdown.push('Đúng chính xác tỷ số: +3');
                     calculatedBasePoints += 3;
                   } else if (pred.home_score - pred.away_score === m.home_score - m.away_score) {
                     breakdown.push('Đúng hiệu số: +1');
                     calculatedBasePoints += 1;
                   }
                 } else {
                   breakdown.push('Sai kết quả: 0');
                 }
               }
             }
          }
          
          if (m.status === 'finished' && pointsEarned > calculatedBasePoints) {
            breakdown.push(`Điểm mạo hiểm: +${pointsEarned - calculatedBasePoints}`);
          }
          
          if (m.status !== 'finished') {
            breakdown = [];
          }

          return {
            match_id: m.id,
            home_team: m.home_team?.name || 'Đội nhà',
            away_team: m.away_team?.name || 'Đội khách',
            match_status: m.status,
            match_home_score: m.home_score,
            match_away_score: m.away_score,
            match_round: m.round,
            kickoff_time: m.kickoff_time,
            predicted_home_score: pred.home_score,
            predicted_away_score: pred.away_score,
            points_earned: pointsEarned,
            breakdown
          };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b!.kickoff_time).getTime() - new Date(a!.kickoff_time).getTime()) // Sort newest first

    };

    return NextResponse.json(userStats);
  } catch (error: any) {
    console.error('API /api/user-stats Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
