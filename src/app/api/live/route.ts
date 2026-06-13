import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { scrapeLiveScore } from '@/lib/scraper';
import { internalUpdateMatchResult } from '@/lib/match-logic';

export const dynamic = 'force-dynamic';

// Biến toàn cục để lưu thời gian cào lần cuối (hoạt động tốt trong môi trường serverless nóng)
// Tránh việc bị spam quá nhiều nếu có 1000 user cùng request
let lastScrapedAt = 0;

export async function GET() {
  try {
    const now = Date.now();

    // 1. Lấy danh sách trận đấu đang pending hoặc live
    const { data: matches } = await supabaseAdmin
      .from('matches')
      .select('id, kickoff_time, status, home_score, away_score, round, home_team_id, away_team_id, home_team:home_team_id(name), away_team:away_team_id(name)')
      .in('status', ['pending', 'live']);

    if (!matches || matches.length === 0) {
      return NextResponse.json({ message: 'Không có trận đấu nào đang diễn ra.' });
    }

    // Lọc ra những trận ĐANG DIỄN RA hoặc VỪA MỚI KẾT THÚC, hoặc SẮP DIỄN RA TRONG 15 PHÚT
    const activeMatches = matches.filter(m => {
      const kickoff = new Date(m.kickoff_time).getTime();
      const diffMinutes = (now - kickoff) / (1000 * 60);
      return m.status === 'live' || (diffMinutes >= -15 && diffMinutes <= 48 * 60);
    });

    if (activeMatches.length === 0) {
      return NextResponse.json({ message: 'Các trận đấu chưa tới giờ lăn bóng.' });
    }

    // 2. Throttling: Kiểm tra xem đã qua 10 giây kể từ lần cào trước chưa?
    if (now - lastScrapedAt < 10000) {
      // Chưa đủ 10 giây, chỉ trả về dữ liệu trong DB hiện tại (Cache)
      return NextResponse.json({
        message: 'Đang dùng Cache DB (thời gian chờ 10s)',
        matches: activeMatches.map(m => ({
          id: m.id,
          home_score: m.home_score,
          away_score: m.away_score,
          status: m.status
        }))
      });
    }

    // Cập nhật timestamp để các request song song khác rơi vào Cache
    lastScrapedAt = now;
    
    const results = [];

    // 3. Tiến hành cào dữ liệu cho từng trận đang active
    for (const m of activeMatches) {
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
              scrapeData.away_score!
            );
            results.push({ match_id: m.id, action: 'finished_and_calculated' });

          } else {
            // Đang live -> Chỉ cập nhật tỷ số
            await supabaseAdmin.from('matches').update({
              home_score: scrapeData.home_score,
              away_score: scrapeData.away_score,
              status: newStatus
            }).eq('id', m.id);
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
