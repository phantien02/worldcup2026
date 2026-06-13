require('dotenv').config({ path: '.env.local' });
import { scrapeLiveScore } from './src/lib/scraper';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

(async () => {
  const matches = [
    { home: 'Canada', away: 'Bosnia' },
    { home: 'Hàn Quốc', away: 'CH Séc' },
    { home: 'Mỹ', away: 'Paraguay' },
    { home: 'Mexico', away: 'Nam Phi' }
  ];

  for (const m of matches) {
    console.log(`\n--- Đang thử cào: ${m.home} vs ${m.away} ---`);
    const result = await scrapeLiveScore(m.home, m.away);
    console.log(`=> KẾT QUẢ AI TRẢ VỀ:`, result);
    await delay(3000); // Đợi 3s để tránh bị Google báo lỗi 503 High Demand
  }
})();
