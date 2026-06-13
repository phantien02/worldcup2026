import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { scrapeLiveScore } from '@/lib/scraper';

export async function GET() {
  try {
    const { data: matches, error } = await supabaseAdmin
      .from('matches')
      .select('id, home_team:home_team_id(name), away_team:away_team_id(name)')
      .eq('status', 'finished');

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({ success: true, message: "Không có trận đấu nào cần backfill." });
    }

    let results = [];

    for (const match of matches) {
      const homeName = (match.home_team as any)?.name;
      const awayName = (match.away_team as any)?.name;
      
      try {
        const result = await scrapeLiveScore(homeName, awayName);
        if (result && result.events) {
          const { error: updateError } = await supabaseAdmin
            .from('matches')
            .update({ 
              events: result.events,
              home_score: result.home_score,
              away_score: result.away_score,
              match_time: result.match_time
            })
            .eq('id', match.id);
          
          if (!updateError) {
            results.push(`Thành công: ${homeName} vs ${awayName}`);
          } else {
            results.push(`Lỗi DB: ${homeName} vs ${awayName} - ${updateError.message}`);
          }
        } else {
          results.push(`Không tìm thấy events: ${homeName} vs ${awayName}`);
        }
      } catch (err: any) {
        results.push(`Lỗi cào dữ liệu: ${homeName} vs ${awayName} - ${err.message}`);
      }
      
      // Delay 2s
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
