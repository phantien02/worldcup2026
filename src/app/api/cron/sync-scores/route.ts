import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { internalUpdateMatchResult } from '@/lib/match-logic';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/jwt';

// Hàm chuẩn hoá tên đội để mapping (có thể bổ sung thêm)
const normalizeTeamName = (name: string) => {
  const map: Record<string, string> = {
    'Hàn Quốc': 'South Korea',
    'Mỹ': 'USA',
    'Hoa Kỳ': 'USA',
    'Anh': 'England',
    'Tây Ban Nha': 'Spain',
    'Đức': 'Germany',
    'Pháp': 'France',
    'Ý': 'Italy',
    'Bồ Đào Nha': 'Portugal',
    'Hà Lan': 'Netherlands',
    'Nhật Bản': 'Japan',
    'CH Séc': 'Czech Republic',
    'Cộng hòa Séc': 'Czech Republic',
    'Nam Phi': 'South Africa',
    'Bỉ': 'Belgium',
    'Đan Mạch': 'Denmark',
    'Thụy Sĩ': 'Switzerland',
    'Thụy Điển': 'Sweden',
    'Ba Lan': 'Poland',
    'Bờ Biển Ngà': 'Ivory Coast',
    'Marocco': 'Morocco',
    'Úc': 'Australia',
    'Thổ Nhĩ Kỳ': 'Turkey',
    'Cabo Verde': 'Cape Verde',
    'Ai Cập': 'Egypt',
    'Na Uy': 'Norway',
    'Áo': 'Austria',
    'CHDC Congo': 'DR Congo',
    'Nga': 'Russia',
    'Bắc Ireland': 'Northern Ireland',
    'Xứ Wales': 'Wales'
  };
  return map[name] || name;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get('Authorization');
    
    // Kiểm tra Vercel Cron
    let isAuthorized = false;
    if (authHeader === `Bearer ${process.env.CRON_SECRET}` || searchParams.get('secret') === process.env.CRON_SECRET) {
      isAuthorized = true;
    } else {
      // Kiểm tra Admin Token
      const cookieStore = await cookies();
      const adminToken = cookieStore.get('admin_token')?.value;
      if (adminToken) {
        isAuthorized = await verifyAdminToken(adminToken);
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.API_SPORTS_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API_SPORTS_KEY' }, { status: 500 });
    }

    // 1. Lấy các trận đang pending hoặc live
    const { data: matches } = await supabaseAdmin
      .from('matches')
      .select('id, kickoff_time, status, home_score, away_score, round, home_team_id, away_team_id, home_team:home_team_id(name), away_team:away_team_id(name)')
      .in('status', ['pending', 'live']);

    if (!matches || matches.length === 0) {
      return NextResponse.json({ message: 'No active matches to sync' });
    }

    // 2. Gom nhóm theo ngày để gọi API
    const datesToFetch = new Set<string>();
    matches.forEach(m => {
      // Chỉ fetch các trận mà thời gian kickoff đã trôi qua, hoặc sắp diễn ra trong 24h tới
      const kickoff = new Date(m.kickoff_time);
      const now = new Date();
      // Nếu đá hôm qua, hôm nay, ngày mai
      if (kickoff.getTime() < now.getTime() + 24 * 60 * 60 * 1000) {
        // Lấy ngày theo múi giờ Việt Nam (YYYY-MM-DD)
        const vnDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(kickoff);
        datesToFetch.add(vnDate);
      }
    });

    const results = [];

    for (const date of datesToFetch) {
      // Gọi API-Football kèm tham số timezone Việt Nam
      const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}&timezone=Asia/Ho_Chi_Minh`, {
        headers: {
          'x-apisports-key': apiKey
        }
      });
      const data = await response.json();
      const fixtures = data.response || [];

      for (const m of matches) {
        // So sánh theo ngày Việt Nam
        const mDate = new Date(m.kickoff_time);
        const matchVnDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(mDate);
        if (matchVnDate !== date) continue;

        // Cố gắng tìm trận đấu tương ứng (so sánh tên đội)
        const homeName = normalizeTeamName((m.home_team as any).name || (m.home_team as any)[0]?.name).toLowerCase();
        const awayName = normalizeTeamName((m.away_team as any).name || (m.away_team as any)[0]?.name).toLowerCase();

        const fixture = fixtures.find((f: any) => 
          f.teams.home.name.toLowerCase().includes(homeName) || 
          f.teams.away.name.toLowerCase().includes(awayName) ||
          homeName.includes(f.teams.home.name.toLowerCase()) ||
          awayName.includes(f.teams.away.name.toLowerCase())
        );

        if (fixture) {
          const apiStatus = fixture.fixture.status.short; // FT, HT, 1H, 2H, NS...
          const goalsHome = fixture.goals.home;
          const goalsAway = fixture.goals.away;

          const isMatchFinished = ['FT', 'AET', 'PEN'].includes(apiStatus);
          const isMatchLive = ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'].includes(apiStatus);

          let newStatus = m.status;
          if (isMatchFinished) newStatus = 'finished';
          else if (isMatchLive) newStatus = 'live';

          // Nếu có thay đổi tỷ số hoặc trạng thái
          if (newStatus !== m.status || goalsHome !== m.home_score || goalsAway !== m.away_score) {
            
            if (newStatus === 'finished' && m.status !== 'finished') {
              // Phải gọi updateMatchResult để tính điểm
              // Kiểm tra xem có phải knockout không
              const knockoutRounds = ['Vòng 32 đội', 'Vòng 16 đội', 'Tứ kết', 'Bán kết', 'Tranh hạng ba', 'Chung kết'];
              const isKnockout = knockoutRounds.includes(m.round || '');
              
              let winMethod: any = '90_mins';
              let winnerId = undefined;

              if (isKnockout) {
                if (apiStatus === 'AET') winMethod = 'extra_time';
                if (apiStatus === 'PEN') winMethod = 'penalties';
                if (fixture.teams.home.winner) winnerId = m.home_team_id;
                else if (fixture.teams.away.winner) winnerId = m.away_team_id;
              }

              await internalUpdateMatchResult(
                m.id, 
                goalsHome !== null ? goalsHome : 0, 
                goalsAway !== null ? goalsAway : 0,
                isKnockout,
                winnerId,
                winMethod,
                undefined, undefined, // score90
                fixture.score.penalty.home, fixture.score.penalty.away
              );
              results.push({ match_id: m.id, action: 'finished_and_calculated', fixture_id: fixture.fixture.id });
            } else {
              // Chỉ cập nhật tỷ số live
              await supabaseAdmin.from('matches').update({
                home_score: goalsHome,
                away_score: goalsAway,
                status: newStatus
              }).eq('id', m.id);
              results.push({ match_id: m.id, action: 'updated_live_score', fixture_id: fixture.fixture.id });
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, processed: results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
