import { config } from 'dotenv';
config({ path: '.env.local' });
import { scrapeLiveScore } from './src/lib/scraper';

async function run() {
  const result = await scrapeLiveScore('Uzbekistan', 'Colombia');
  console.log('=== KẾT QUẢ SCRAPER ===');
  console.log(JSON.stringify(result, null, 2));
}
run();
