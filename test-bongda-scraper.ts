import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { scrapeLiveScore } from './src/lib/scraper';

async function test() {
  console.log('Testing scrapeLiveScore for Qatar vs Thụy Sĩ...');
  const result = await scrapeLiveScore('Qatar', 'Thụy Sĩ');
  console.log('Result:', result);
}

test();
