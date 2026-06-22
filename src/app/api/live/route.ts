import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { scrapeLiveScore, fetchDailyFixturesFromApi } from '@/lib/scraper';
import { internalUpdateMatchResult } from '@/lib/match-logic';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

let lastScrapedAt = 0;

export async function GET() {
  try {
    const now = Date.now();

    const { data: matches } = await supabaseAdmin
      .from('matches')
      .select('id, kickoff_time, status, home_score, away_score, round, home_team_id, away_team_id, events, home_team:home_team_id(name), away_team:away_team_id(name)')
      .in('status', ['pending', 'live']);

    if (!matches || matches.length === 0) {
      return NextResponse.json({ message: 'Không có trận đấu nào đang diễn ra.' });
    }

    const activeMatches = matches.filter(m => {
      const kickoff = new Date(m.kickoff_time).getTime();
      const diffMinutes = (now - kickoff) / (1000 * 60);
      
      const knockoutRounds = ['Vòng 32 đội', 'Vòng 16 đội', 'Tứ kết', 'Bán kết', 'Tranh hạng ba', 'Chung kết'];
      const isKnockout = knockoutRounds.includes(m.round || '');
      const minMinutes = isKnockout ? 150 : 120;

      return (m.status === 'live' || diffMinutes >= minMinutes) && diffMinutes <= 5 * 60;
    });

    if (activeMatches.length === 0) {
      return NextResponse.json({ message: 'Các trận đấu chưa tới giờ lăn bóng.' });
    }

    if (now - lastScrapedAt < 5 * 60 * 1000) {
      return NextResponse.json({
        message: 'Đang dùng Cache DB (thời gian chờ 5p)',
        matches: activeMatches.map(m => ({
          id: m.id,
          home_score: m.home_score,
          away_score: m.away_score,
          status: m.status,
          events: m.events
        }))
      });
    }

    lastScrapedAt = now;
    
    const results = [];
    const matchesToScrape = activeMatches.slice(0, 2);

    // Lấy danh sách các ngày duy nhất (theo giờ VN) của các trận đang đá
    const uniqueDates = Array.from(new Set(matchesToScrape.map(m => {
       return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(m.kickoff_time));
    })));

    let allApiFixtures: any[] = [];
    for (const dateVN of uniqueDates) {
       const fixtures = await fetchDailyFixturesFromApi(dateVN);
       allApiFixtures = allApiFixtures.concat(fixtures);
    }

    for (const m of matchesToScrape) {
      const homeName = (m.home_team as any).name || (m.home_team as any)[0]?.name;
      const awayName = (m.away_team as any).name || (m.away_team as any)[0]?.name;

      const scrapeData = await scrapeLiveScore(homeName, awayName, m.kickoff_time, allApiFixtures);

      if (scrapeData) {
        if (m.home_score !== null && m.away_score !== null && scrapeData.home_score !== null && scrapeData.away_score !== null) {
           const oldTotal = m.home_score + m.away_score;
           const newTotal = scrapeData.home_score + scrapeData.away_score;
           if (newTotal < oldTotal) {
              console.log(`[API Live] 🛑 CẢNH BÁO: Scraper định đẩy tỷ số từ ${m.home_score}-${m.away_score} xuống ${scrapeData.home_score}-${scrapeData.away_score}. BỊ CHẶN LẠI do tỷ số đi lùi!`);
              continue; // Bỏ qua cập nhật trận này
           }
        }

        let newStatus = m.status;
        if (scrapeData.status === 'finished') newStatus = 'finished';
        else if (scrapeData.status === 'live') newStatus = 'live';

        // FAIL-SAFE: Ép trận đấu kết thúc nếu AI không đọc được chữ FT nhưng thời gian đã quá hạn (Vòng bảng > 150p, Knockout > 210p)
        const knockoutRoundsCheck = ['Vòng 32 đội', 'Vòng 16 đội', 'Tứ kết', 'Bán kết', 'Tranh hạng ba', 'Chung kết'];
        const isKnockoutCheck = knockoutRoundsCheck.includes(m.round || '');
        const maxLiveMinutes = isKnockoutCheck ? 210 : 150;
        const diffMinutesCheck = (Date.now() - new Date(m.kickoff_time).getTime()) / (1000 * 60);

        if (newStatus === 'live' && diffMinutesCheck > maxLiveMinutes && scrapeData.home_score !== null) {
          newStatus = 'finished';
        }

        // Có sự thay đổi về tỷ số hoặc trạng thái
        if (newStatus !== m.status || scrapeData.home_score !== m.home_score || scrapeData.away_score !== m.away_score) {
          
          if (newStatus === 'finished' && m.status !== 'finished') {
            // Trận đấu kết thúc -> Gọi logic chốt điểm
            const knockoutRounds = ['Vòng 32 đội', 'Vòng 16 đội', 'Tứ kết', 'Bán kết', 'Tranh hạng ba', 'Chung kết'];
            const isKnockout = knockoutRounds.includes(m.round || '');
            
            // Do AI chỉ cào được cơ bản, nên nếu là Knockout ta mặc định 90 phút.
            // (Thực tế LLM có thể đọc được Penalty nếu cấu hình Prompt chi tiết hơn)
            let winMethod: any = '90_mins';
            let winnerId = undefined;

            if (isKnockout) {
               // Đơn giản hóa: Đội nào điểm cao hơn thì thắng. Nếu hòa thì có thể là Penalty (tạm set theo tỷ số)
               if (scrapeData.home_score! > scrapeData.away_score!) winnerId = m.home_team_id;
               else if (scrapeData.away_score! > scrapeData.home_score!) winnerId = m.away_team_id;
            }

            await internalUpdateMatchResult(
              m.id, 
              scrapeData.home_score!, 
              scrapeData.away_score!,
              isKnockout,
              winnerId,
              winMethod,
              scrapeData.home_score!, // Tỷ số 90 phút tạm bằng tỷ số chung cuộc
              scrapeData.away_score!,
              undefined,
              undefined,
              scrapeData.events
            );
            results.push({ match_id: m.id, action: 'finished_and_calculated' });

          } else {
            // Đang live -> Chỉ cập nhật tỷ số và events
            const updatePayload: any = {
              home_score: scrapeData.home_score,
              away_score: scrapeData.away_score,
              status: newStatus
            };
            if (scrapeData.events) {
              updatePayload.events = scrapeData.events;
            }
            await supabaseAdmin.from('matches').update(updatePayload).eq('id', m.id);
            results.push({ match_id: m.id, action: 'updated_live_score' });
          }
        }
      }
    }

    return NextResponse.json({
      message: 'Đã cào dữ liệu mới',
      processed: results,
      matches: activeMatches // Có thể trả về để FE render nếu cần
    });

  } catch (error: any) {
    console.error('Lỗi API Live:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
