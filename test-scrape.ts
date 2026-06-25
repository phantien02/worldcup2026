import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

import { scrapeLiveScore, fetchDailyFixturesFromApi } from './src/lib/scraper';

async function run() {
  const startDate = new Date('2026-06-21T23:00:00+07:00').getTime();
  const endDate = new Date('2026-06-22T23:59:59+07:00').getTime();

  // Lấy các trận trong DB
  const { data: matches } = await supabaseAdmin
    .from('matches')
    .select('id, kickoff_time, home_team_id, away_team_id, home_team:home_team_id(name), away_team:away_team_id(name)')
    .order('kickoff_time', { ascending: true });

  if (!matches) {
    console.log("No matches found.");
    return;
  }

  const targetMatches = matches.filter(m => {
    const k = new Date(m.kickoff_time).getTime();
    return k >= startDate && k <= endDate;
  });

  console.log(`Tìm thấy ${targetMatches.length} trận đấu từ 23:00 21/06 đến hôm nay.`);

  const uniqueDates = Array.from(new Set(targetMatches.map(m => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(m.kickoff_time));
  })));

  let allApiFixtures: any[] = [];
  for (const dateVN of uniqueDates) {
     const fixtures = await fetchDailyFixturesFromApi(dateVN);
     allApiFixtures = allApiFixtures.concat(fixtures);
  }

  for (const m of targetMatches) {
    const homeName = (m.home_team as any).name || (m.home_team as any)[0]?.name;
    const awayName = (m.away_team as any).name || (m.away_team as any)[0]?.name;
    
    console.log(`\n======================================`);
    console.log(`Trận: ${homeName} vs ${awayName} (Lúc: ${new Date(m.kickoff_time).toLocaleString('vi-VN')})`);
    
    const result = await scrapeLiveScore(homeName, awayName, m.kickoff_time, allApiFixtures);
    
    if (result) {
      console.log(`-> KẾT QUẢ CÀO ĐƯỢC: ${result.home_score} - ${result.away_score} (${result.status})`);
      if (result.evidence) console.log(`-> Bằng chứng: ${result.evidence}`);
    } else {
      console.log(`-> KHÔNG THỂ CÀO ĐƯỢC KẾT QUẢ.`);
    }
  }
}

run();
