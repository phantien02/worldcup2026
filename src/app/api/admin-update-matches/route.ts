import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  try {
    // Lấy toàn bộ teams để map tên → id
    const { data: teams } = await supabaseAdmin.from('teams').select('id, name');
    const teamMap: Record<string, string> = {};
    teams?.forEach(t => teamMap[t.name] = t.id);

    // Debug: in ra tất cả tên đội để kiểm tra đúng tên
    const teamNames = teams?.map(t => t.name).sort();

    // Lấy toàn bộ matches vòng 32 (bất kể round label)
    const { data: allMatches } = await supabaseAdmin
      .from('matches')
      .select('id, home_team_id, away_team_id, round, kickoff_time')
      .or('round.eq.Vòng 32 Đội,round.is.null,round.eq.pending');

    return NextResponse.json({
      teamNames,
      teamMap,
      matchCount: allMatches?.length,
      matches: allMatches
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
