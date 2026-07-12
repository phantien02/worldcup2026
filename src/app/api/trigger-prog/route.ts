import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  try {
    const { data: matches } = await supabaseAdmin.from('matches').select('id, home_team_id, away_team_id, round, status, winner_id');
    const { data: teams } = await supabaseAdmin.from('teams').select('id, name');
    const teamMap: Record<string, any> = {}; 
    teams?.forEach((t: any) => teamMap[t.id] = t);

    let fixedCount = 0;
    const matchIdMappingJson = require('@/data/matchIdMapping.json');

    // FORCE FIX MATCH 102
    const anh = teams?.find((t: any) => t.name === 'Anh');
    const match102_id = '9ddbb25c-4dcb-4f9f-8ff3-34ad3c9d61e3';
    if (anh) {
      await supabaseAdmin.from('matches').update({ home_team_id: anh.id }).eq('id', match102_id);
    }
    
    // FORCE FIX TAY BAN NHA FLAG
    const tbn = teams?.find((t: any) => t.name === 'Tây Ban Nha');
    if (tbn) {
      await supabaseAdmin.from('teams').update({ flag_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Bandera_de_Espa%C3%B1a.svg/1200px-Bandera_de_Espa%C3%B1a.svg.png' }).eq('id', tbn.id);
    }

    if (matches && teams) {
      for (const match of matches) {
        if (match.status === 'finished' && match.round !== 'Vòng bảng' && match.winner_id) {
          
          const currentMatchName = matchIdMappingJson[match.id];
          
          if (currentMatchName) {
            const winnerId = match.winner_id;
            const loserId = match.home_team_id === winnerId ? match.away_team_id : match.home_team_id;

            const winnerPlaceholderNames = [`Thắng ${currentMatchName.toLowerCase()}`, `thắng ${currentMatchName.toLowerCase()}`, `Thắng trận ${currentMatchName.replace('Trận ', '')}`];
            const loserPlaceholderNames = [`Thua ${currentMatchName.toLowerCase()}`, `thua ${currentMatchName.toLowerCase()}`, `Thua trận ${currentMatchName.replace('Trận ', '')}`];

            const winnerPlaceholderTeam = teams.find((t: any) => t.name.toLowerCase() === winnerPlaceholderNames[2].toLowerCase() || t.name.toLowerCase() === winnerPlaceholderNames[0].toLowerCase());
            const loserPlaceholderTeam = teams.find((t: any) => t.name.toLowerCase() === loserPlaceholderNames[2].toLowerCase() || t.name.toLowerCase() === loserPlaceholderNames[0].toLowerCase());

            if (winnerPlaceholderTeam) {
              await supabaseAdmin.from('matches').update({ home_team_id: winnerId }).eq('home_team_id', winnerPlaceholderTeam.id);
              await supabaseAdmin.from('matches').update({ away_team_id: winnerId }).eq('away_team_id', winnerPlaceholderTeam.id);
              fixedCount++;
            }
            if (loserPlaceholderTeam && loserId) {
              await supabaseAdmin.from('matches').update({ home_team_id: loserId }).eq('home_team_id', loserPlaceholderTeam.id);
              await supabaseAdmin.from('matches').update({ away_team_id: loserId }).eq('away_team_id', loserPlaceholderTeam.id);
            }
          }
        }
      }
    }
    
    return NextResponse.json({ success: true, fixedCount, message: 'Fixed propagation for all finished knockout matches' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
