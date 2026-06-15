import { NextResponse } from 'next/server';
import { internalUpdateMatchResult } from '@/lib/match-logic';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: matches, error } = await supabaseAdmin
      .from('matches')
      .select('id, home_team:home_team_id(name), away_team:away_team_id(name)')
      .eq('status', 'finished');

    if (error) throw error;

    const match = matches.find((m: any) => 
      (m.home_team?.name === 'Đức' || m.home_team?.[0]?.name === 'Đức') && 
      (m.away_team?.name === 'Curacao' || m.away_team?.[0]?.name === 'Curacao')
    );

    if (!match) return NextResponse.json({ error: 'Không tìm thấy trận đấu' });

    await internalUpdateMatchResult(match.id, 7, 1);
    
    return NextResponse.json({ success: true, message: 'Đã cập nhật Đức 7 - 1 Curacao thành công' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
