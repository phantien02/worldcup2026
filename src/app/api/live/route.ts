import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { scrapeLiveScore } from '@/lib/scraper';
import { internalUpdateMatchResult } from '@/lib/match-logic';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Tăng timeout cho Vercel Hobby lên tối đa 60s để AI cào data không bị ngắt

// Biến toàn cục để lưu thời gian cào lần cuối (hoạt động tốt trong môi trường serverless nóng)
// Tránh việc bị spam quá nhiều nếu có 1000 user cùng request
let lastScrapedAt = 0;

export async function GET() {
  try {
    const now = Date.now();

    // 1. Lấy danh sách trận đấu đang pending hoặc live
    const { data: matches } = await supabaseAdmin
      .from('matches')
      .select('id, kickoff_time, status, home_score, away_score, round, home_team_id, away_team_id, events, home_team:home_team_id(name), away_team:away_team_id(name)')
      .in('status', ['pending', 'live']);

    if (!matches || matches.length === 0) {
      return NextResponse.json({ message: 'Không có trận đấu nào đang diễn ra.' });
    }

    // CHỈ lọc ra những trận ĐÃ CÓ KHẢ NĂNG KẾT THÚC (kickoff + 110 phút trở lên)
    // Không cào trong lúc đang đá vì không thể lấy được livescore bằng Serverless
    // Giới hạn: tối đa 5 tiếng sau kickoff (phòng trường hợp hiệp phụ + penalty)
    const activeMatches = matches.filter(m => {
      const kickoff = new Date(m.kickoff_time).getTime();
      const diffMinutes = (now - kickoff) / (1000 * 60);
      
      const knockoutRounds = ['Vòng 32 đội', 'Vòng 16 đội', 'Tứ kết', 'Bán kết', 'Tranh hạng ba', 'Chung kết'];
      const isKnockout = knockoutRounds.includes(m.round || '');
      const minMinutes = isKnockout ? 150 : 120;

      return m.status === 'live' || (diffMinutes >= minMinutes && diffMinutes <= 5 * 60);
    });

    if (activeMatches.length === 0) {
      return NextResponse.json({ message: 'Các trận đấu chưa tới giờ lăn bóng.' });
    }

    // 2. Throttling: Chờ ít nhất 5 PHÚT giữa các lần cào để tiết kiệm Gemini quota
    if (now - lastScrapedAt < 5 * 60 * 1000) {
      // Chưa đủ 60 giây, chỉ trả về dữ liệu trong DB hiện tại (Cache)
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

    // Cập nhật timestamp để các request song song khác rơi vào Cache
    lastScrapedAt = now;
    
    const results = [];

    // Lấy tối đa 2 trận để tránh hit rate limit (15 RPM của Gemini 3.1)
    const matchesToScrape = activeMatches.slice(0, 2);

    // 3. Tiến hành cào dữ liệu cho từng trận đang active
    for (const m of matchesToScrape) {
      const homeName = (m.home_team as any).name || (m.home_team as any)[0]?.name;
      const awayName = (m.away_team as any).name || (m.away_team as any)[0]?.name;

      const scrapeData = await scrapeLiveScore(homeName, awayName);

      if (scrapeData) {
        let newStatus = m.status;
        if (scrapeData.status === 'finished') newStatus = 'finished';
        else if (scrapeData.status === 'live') newStatus = 'live';

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
