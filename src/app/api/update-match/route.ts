import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  try {
    const { data: matches } = await supabaseAdmin
      .from('matches')
      .select('id, home_team_id, away_team_id')
      .eq('id', 'd3ddea91-1554-4625-8a04-dc489604c927');

    if (!matches || matches.length === 0) {
      return NextResponse.json({ success: false, error: 'Match not found' });
    }

    const { error } = await supabaseAdmin
      .from('matches')
      .update({ kickoff_time: '2026-07-06T19:00:00.000Z' })
      .eq('id', 'd3ddea91-1554-4625-8a04-dc489604c927');

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true, message: 'Updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
