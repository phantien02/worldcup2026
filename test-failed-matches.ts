import { config } from 'dotenv';
config({ path: '.env.local' });
import { scrapeLiveScore } from './src/lib/scraper';

async function run() {
  console.log('--- Uruguay vs Cape Verde ---');
  console.log(await scrapeLiveScore('Uruguay', 'Cape Verde'));
}

run();
