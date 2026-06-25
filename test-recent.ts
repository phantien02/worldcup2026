import { config } from 'dotenv';
config({ path: '.env.local' });
import { scrapeLiveScore } from './src/lib/scraper';

async function run() {
  const result1 = await scrapeLiveScore('Mexico', 'Hàn Quốc');
  console.log('=== KẾT QUẢ SCRAPER MEXICO VS HÀN QUỐC ===');
  console.log(JSON.stringify(result1, null, 2));

  const result2 = await scrapeLiveScore('CH Séc', 'Nam Phi');
  console.log('=== KẾT QUẢ SCRAPER CH SÉC VS NAM PHI ===');
  console.log(JSON.stringify(result2, null, 2));

  const result3 = await scrapeLiveScore('Thụy Sĩ', 'Bosnia');
  console.log('=== KẾT QUẢ SCRAPER THỤY SĨ VS BOSNIA ===');
  console.log(JSON.stringify(result3, null, 2));
}
run();
