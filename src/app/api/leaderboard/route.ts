import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: profiles, error: profileErr } = await supabaseAdmin.from('profiles').select('*');
    if (profileErr) throw profileErr;

    const { data: matches, error: matchErr } = await supabaseAdmin
      .from('matches')
      .select('id, home_score, away_score, status, round, kickoff_time')
      .eq('status', 'finished');
    if (matchErr) throw matchErr;

    // Filter out 'DELETED' matches
    const validMatches = matches.filter(m => m.round !== 'DELETED');
    const matchMap: Record<string, any> = {};
    validMatches.forEach(m => matchMap[m.id] = m);

    const validMatchIds = validMatches.map(m => m.id);

    let predictions: any[] = [];
    if (validMatchIds.length > 0) {
        let from = 0;
        const step = 1000;
        while (true) {
          const { data: preds, error: predErr } = await supabaseAdmin
            .from('predictions')
            .select('user_id, match_id, home_score, away_score, prediction_result, points_earned')
            .in('match_id', validMatchIds)
            .range(from, from + step - 1);
            
          if (predErr) throw predErr;
          if (!preds || preds.length === 0) break;
          
          predictions = predictions.concat(preds);
          if (preds.length < step) break;
          from += step;
        }
    }

    // 1. Sort matches chronologically
    validMatches.sort((a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime());

    const users = profiles.filter(p => p.display_name !== 'guest');
    const userHistoryMap: Record<string, any[]> = {};
    const userStatsTracker: Record<string, { totalPts: number, exactScores: number, exactDiffs: number }> = {};
    
    users.forEach(u => {
      userHistoryMap[u.id] = [];
      userStatsTracker[u.id] = { totalPts: 0, exactScores: 0, exactDiffs: 0 };
    });

    // 2. Calculate Rank for each Match chronologically
    validMatches.forEach((currentMatch, matchIndex) => {
      // Find predictions for THIS match
      const matchPreds = predictions.filter(pred => pred.match_id === currentMatch.id);
      
      matchPreds.forEach(pred => {
         const tracker = userStatsTracker[pred.user_id];
         if (!tracker) return; // skip guests
         
         tracker.totalPts += (pred.points_earned || 0);
         
         if (pred.home_score !== null && pred.away_score !== null && currentMatch.home_score !== null && currentMatch.away_score !== null) {
            const isExactScore = pred.home_score === currentMatch.home_score && pred.away_score === currentMatch.away_score;
            const isExactDiff = (pred.home_score - pred.away_score) === (currentMatch.home_score - currentMatch.away_score);
            if (isExactScore) tracker.exactScores++;
            else if (isExactDiff) tracker.exactDiffs++;
         }
      });

      // Sort users to get rank
      const currentStatsArray = users.map(u => ({
          id: u.id,
          display_name: u.display_name,
          totalPts: userStatsTracker[u.id].totalPts,
          exactScores: userStatsTracker[u.id].exactScores,
          exactDiffs: userStatsTracker[u.id].exactDiffs
      }));
      
      currentStatsArray.sort((a, b) => {
        if (b.totalPts !== a.totalPts) return b.totalPts - a.totalPts;
        if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
        if (b.exactDiffs !== a.exactDiffs) return b.exactDiffs - a.exactDiffs;
        return (a.display_name || '').localeCompare(b.display_name || '');
      });

      const label = `Trận ${matchIndex + 1}`;

      currentStatsArray.forEach((stat, rankIndex) => {
        userHistoryMap[stat.id].push({
          date: label, // keep key as 'date' for frontend compatibility
          rank: rankIndex + 1,
          points: stat.totalPts
        });
      });
    });

    // 3. Build final leaderboard
    const leaderboard = users.map(p => {
      let correctResults = 0;
      let exactScores = 0;
      let exactDiffs = 0;

      const userPreds = predictions.filter(pred => pred.user_id === p.id);

      userPreds.forEach(pred => {
        const m = matchMap[pred.match_id];
        if (!m) return; // safeguard
        
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
            exactDiffs++;
          }
        }
      });

      const history = userHistoryMap[p.id] || [];
      // Calculate rankTrend based on the last 2 records
      let rankTrend = 0;
      if (history.length >= 2) {
        const currentRank = history[history.length - 1].rank;
        const previousRank = history[history.length - 2].rank;
        rankTrend = previousRank - currentRank; // positive means went UP in rank
      }

      return {
        ...p,
        stats: {
          totalPreds: validMatchIds.length,
          actualPreds: userPreds.length,
          correctResults,
          exactScores,
          exactDiffs
        },
        rankHistory: history,
        rankTrend: rankTrend,
        calculatedTotalPoints: history.length > 0 ? history[history.length - 1].points : 0
      };
    });

    // Final Sort
    leaderboard.sort((a, b) => {
      const ptDiff = b.calculatedTotalPoints - a.calculatedTotalPoints;
      if (ptDiff !== 0) return ptDiff;
      const scoreDiff = b.stats.exactScores - a.stats.exactScores;
      if (scoreDiff !== 0) return scoreDiff;
      const diffDiff = b.stats.exactDiffs - a.stats.exactDiffs;
      if (diffDiff !== 0) return diffDiff;
      return (a.display_name || '').localeCompare(b.display_name || '');
    });

    // Calculate rankTrend based on the final sorted rank vs previous rank
    leaderboard.forEach((user, index) => {
      const currentRank = index + 1;
      let rankTrend = 0;
      if (user.rankHistory && user.rankHistory.length >= 2) {
        // Compare with the rank from the previous day (length - 2)
        const previousRank = user.rankHistory[user.rankHistory.length - 2].rank;
        rankTrend = previousRank - currentRank; // positive means went UP in rank
      }
      user.rankTrend = rankTrend;
      
      // Update the history's last rank to match the final calculated rank to ensure chart is aligned
      if (user.rankHistory && user.rankHistory.length >= 1) {
          user.rankHistory[user.rankHistory.length - 1].rank = currentRank;
      }
    });

    return NextResponse.json({ success: true, leaderboard });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
