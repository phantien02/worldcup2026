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
      .select('match_id, home_score, away_score, points_earned')
      .eq('user_id', userId);
      
    if (predErr) throw predErr;

    // 3. Fetch matches details
    // We fetch all valid matches to join with predictions
    const { data: matches, error: matchErr } = await supabaseAdmin
      .from('matches')
      .select('id, home_team:home_team_id(name), away_team:away_team_id(name), home_score, away_score, status, round, kickoff_time');
      
    if (matchErr) throw matchErr;

    const validMatches = matches.filter(m => m.round !== 'DELETED');
    const matchMap: Record<string, any> = {};
    validMatches.forEach(m => matchMap[m.id] = m);

    // 4. Combine data
    const userStats = {
      display_name: profile?.display_name || 'Người chơi',
      matchHistory: predictions
        .map(pred => {
          const m = matchMap[pred.match_id];
          if (!m) return null;
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
            points_earned: pred.points_earned || 0
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
