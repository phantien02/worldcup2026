import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: Request) {
  try {
    // 1. Fetch KO matches
    const { data: matches } = await supabaseAdmin.from('matches').select('id, round');
    if (!matches) return NextResponse.json({ error: 'No matches found' });
    
    const koMatches = matches.filter(m => m.round && !m.round.startsWith('Bảng') && m.round !== 'Vòng Bảng');
    const koMatchIds = koMatches.map(m => m.id);
    
    if (koMatchIds.length === 0) return NextResponse.json({ success: true, message: 'No KO matches' });

    // 2. Delete all KO predictions
    const { error } = await supabaseAdmin.from('predictions').delete().in('match_id', koMatchIds);
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true, message: `Successfully deleted KO predictions` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
