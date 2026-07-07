import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  try {
    const { data: teams } = await supabaseAdmin.from('teams').select('id, name');
    const spain = teams?.find(t => t.name === 'Tây Ban Nha');
    const belgium = teams?.find(t => t.name === 'Bỉ');
    
    const p93 = teams?.find(t => t.name.includes('Thắng trận 93'));
    const p94 = teams?.find(t => t.name.includes('Thắng trận 94'));

    if (spain && p93) {
      await supabaseAdmin.from('matches').update({ home_team_id: spain.id }).eq('home_team_id', p93.id);
      await supabaseAdmin.from('matches').update({ away_team_id: spain.id }).eq('away_team_id', p93.id);
    }

    if (belgium && p94) {
      await supabaseAdmin.from('matches').update({ home_team_id: belgium.id }).eq('home_team_id', p94.id);
      await supabaseAdmin.from('matches').update({ away_team_id: belgium.id }).eq('away_team_id', p94.id);
    }
    
    return NextResponse.json({ success: true, message: 'Fixed Match 98 propagation' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
