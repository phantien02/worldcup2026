import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    if (payload.secret !== 'force-pred-2026') return NextResponse.json({error: 'unauthorized'}, {status:401});
    
    const { user_id, match_id, home_score, away_score, advancing_team_id } = payload;
    
    const { data, error } = await supabaseAdmin.from('predictions').upsert({
      user_id,
      match_id,
      home_score,
      away_score,
      advancing_team_id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id, match_id' });
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
