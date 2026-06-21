import { config } from 'dotenv';
config({ path: '.env.local' });
import { scrapeLiveScore } from './src/lib/scraper';

async function run() {
  const result = await scrapeLiveScore('Argentina', 'Algeria');
  console.log(JSON.stringify(result, null, 2));
}
run();
