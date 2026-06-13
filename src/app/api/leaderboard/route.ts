import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: profiles, error: profileErr } = await supabaseAdmin.from('profiles').select('*');
    if (profileErr) throw profileErr;

    const { data: matches, error: matchErr } = await supabaseAdmin
      .from('matches')
      .select('id, home_score, away_score, status, round')
      .eq('status', 'finished');
    if (matchErr) throw matchErr;

    // Filter out 'DELETED' matches
    const validMatches = matches.filter(m => m.round !== 'DELETED');
    const matchMap: Record<string, any> = {};
    validMatches.forEach(m => matchMap[m.id] = m);

    const validMatchIds = validMatches.map(m => m.id);

    let predictions: any[] = [];
    if (validMatchIds.length > 0) {
        // Fetch predictions for all finished matches
        const { data: preds, error: predErr } = await supabaseAdmin
        .from('predictions')
        .select('user_id, match_id, home_score, away_score, prediction_result')
        .in('match_id', validMatchIds);
        if (predErr) throw predErr;
        predictions = preds;
    }

    const leaderboard = profiles
      .filter(p => p.display_name !== 'guest')
      .map(p => {
        let totalPreds = 0;
        let correctResults = 0;
        let exactScores = 0;
        let exactDiffs = 0;

        const userPreds = predictions.filter(pred => pred.user_id === p.id);

        userPreds.forEach(pred => {
          totalPreds++;
          const m = matchMap[pred.match_id];
          
          const actualResult = m.home_score > m.away_score ? 'home_win' : m.home_score === m.away_score ? 'draw' : 'away_win';
          
          if (pred.prediction_result === actualResult) {
            correctResults++;
          }

          if (pred.home_score !== null && pred.away_score !== null && m.home_score !== null && m.away_score !== null) {
            const isExactScore = pred.home_score === m.home_score && pred.away_score === m.away_score;
            const isExactDiff = (pred.home_score - pred.away_score) === (m.home_score - m.away_score);
            
            if (isExactScore) {
              exactScores++;
            } else if (isExactDiff) {
              // "Chỉ dự đoán hiệu số chính xác" => Tức là hiệu số đúng nhưng tỷ số sai
              exactDiffs++;
            }
          }
        });

        return {
          ...p,
          stats: {
            totalPreds,
            correctResults,
            exactScores,
            exactDiffs
          }
        };
      });

    // Sorting logic
    leaderboard.sort((a, b) => {
      // 1. Điểm
      const ptDiff = (b.total_points || 0) - (a.total_points || 0);
      if (ptDiff !== 0) return ptDiff;

      // 2. Số trận dự đoán tỷ số chính xác
      const scoreDiff = b.stats.exactScores - a.stats.exactScores;
      if (scoreDiff !== 0) return scoreDiff;

      // 3. Số trận dự đoán hiệu số chính xác
      const diffDiff = b.stats.exactDiffs - a.stats.exactDiffs;
      if (diffDiff !== 0) return diffDiff;

      // 4. Bảng chữ cái
      return (a.display_name || '').localeCompare(b.display_name || '');
    });

    return NextResponse.json({ success: true, leaderboard });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
