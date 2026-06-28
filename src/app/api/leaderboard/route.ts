import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: profiles, error: profileErr } = await supabaseAdmin.from('profiles').select('*');
    if (profileErr) throw profileErr;

    const { data: matches, error: matchErr } = await supabaseAdmin
      .from('matches')
      .select('id, home_score, away_score, status, round, kickoff_time, home_team:home_team_id(name, flag_url), away_team:away_team_id(name, flag_url)')
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

    // 1. Group matches by Date for Rank History
    const datesSet = new Set<string>();
    validMatches.forEach(m => {
      const dateIso = new Date(m.kickoff_time).toISOString().split('T')[0];
      datesSet.add(dateIso);
    });
    const sortedDates = Array.from(datesSet).sort();

    const users = profiles.filter(p => p.display_name !== 'guest');
    
    // For Rank History (By Date)
    const userRankHistoryMap: Record<string, any[]> = {};
    users.forEach(u => userRankHistoryMap[u.id] = []);

    sortedDates.forEach(date => {
      // Find matches up to this date
      const matchesUpToDate = validMatches.filter(m => {
        const mDate = new Date(m.kickoff_time).toISOString().split('T')[0];
        return mDate <= date;
      });
      const matchIdsUpToDate = new Set(matchesUpToDate.map(m => m.id));

      const dateStats = users.map(p => {
        let totalPts = 0;
        let exactScores = 0;
        let exactDiffs = 0;

        const userPreds = predictions.filter(pred => pred.user_id === p.id && matchIdsUpToDate.has(pred.match_id));

        userPreds.forEach(pred => {
          totalPts += (pred.points_earned || 0);
          const m = matchMap[pred.match_id];
          if (pred.home_score !== null && pred.away_score !== null && m.home_score !== null && m.away_score !== null) {
            const isExactScore = pred.home_score === m.home_score && pred.away_score === m.away_score;
            const isExactDiff = (pred.home_score - pred.away_score) === (m.home_score - m.away_score);
            if (isExactScore) exactScores++;
            else if (isExactDiff) exactDiffs++;
          }
        });
        return { id: p.id, display_name: p.display_name, totalPts, exactScores, exactDiffs };
      });

      dateStats.sort((a, b) => {
        if (b.totalPts !== a.totalPts) return b.totalPts - a.totalPts;
        if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
        if (b.exactDiffs !== a.exactDiffs) return b.exactDiffs - a.exactDiffs;
        return (a.display_name || '').localeCompare(b.display_name || '');
      });

      const [yyyy, mm, dd] = date.split('-');
      const dateStr = `${dd}-${mm}`;
      
      dateStats.forEach((stat, index) => {
        userRankHistoryMap[stat.id].push({
          date: dateStr,
          rank: index + 1
        });
      });
    });

    // 2. Group matches by Match for Points History
    validMatches.sort((a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime());
    
    const userPointsHistoryMap: Record<string, any[]> = {};
    const userStatsTracker: Record<string, { totalPts: number }> = {};
    
    users.forEach(u => {
      userPointsHistoryMap[u.id] = [];
      userStatsTracker[u.id] = { totalPts: 0 };
    });

    validMatches.forEach((currentMatch, matchIndex) => {
      const matchPreds = predictions.filter(pred => pred.match_id === currentMatch.id);
      
      const pointsEarnedInThisMatch: Record<string, number> = {};
      users.forEach(u => pointsEarnedInThisMatch[u.id] = 0);

      matchPreds.forEach(pred => {
         const tracker = userStatsTracker[pred.user_id];
         if (!tracker) return;
         
         const earned = pred.points_earned || 0;
         tracker.totalPts += earned;
         pointsEarnedInThisMatch[pred.user_id] += earned;
      });

      const label = `Trận ${matchIndex + 1}`;

      users.forEach(u => {
        const hTeam: any = currentMatch.home_team;
        const aTeam: any = currentMatch.away_team;
        
        userPointsHistoryMap[u.id].push({
          date: label, // keep key as 'date' for frontend compatibility
          points: pointsEarnedInThisMatch[u.id],
          cumulativePoints: userStatsTracker[u.id].totalPts,
          homeFlag: Array.isArray(hTeam) ? hTeam[0]?.flag_url : hTeam?.flag_url,
          awayFlag: Array.isArray(aTeam) ? aTeam[0]?.flag_url : aTeam?.flag_url,
          homeName: Array.isArray(hTeam) ? hTeam[0]?.name : hTeam?.name,
          awayName: Array.isArray(aTeam) ? aTeam[0]?.name : aTeam?.name
        });
      });
    });

    // 3. Build final leaderboard
    // Helper: classify a round as group stage or knockout
    // Group stage = any round starting with "bảng" / "vòng bảng" / containing "group"
    // Everything else (vòng 32, 16, tứ kết, bán kết, hạng 3, chung kết...) = knockout
    const isGroupStage = (round: string) => {
      if (!round) return false;
      const lower = round.toLowerCase().trim();
      // Explicitly classify group-stage keywords
      if (lower.startsWith('bảng') || lower.startsWith('vòng bảng') || lower.includes('group')) return true;
      // Everything else — including "tranh hạng 3", "hạng 3", "chung kết", etc. — is knockout
      return false;
    };

    const leaderboard = users.map(p => {
      let correctResults = 0;
      let exactScores = 0;
      let exactDiffs = 0;
      let groupPoints = 0;
      let knockoutPoints = 0;

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

        // Accumulate points by round type
        const earned = pred.points_earned || 0;
        if (isGroupStage(m.round)) {
          groupPoints += earned;
        } else {
          knockoutPoints += earned;
        }
      });

      const history = userRankHistoryMap[p.id] || [];
      const ptsHistory = userPointsHistoryMap[p.id] || [];
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
        pointsHistory: ptsHistory,
        rankTrend: rankTrend,
        groupPoints,
        knockoutPoints,
        calculatedTotalPoints: ptsHistory.length > 0 ? ptsHistory[ptsHistory.length - 1].cumulativePoints : 0
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
