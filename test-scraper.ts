require('dotenv').config({ path: '.env.local' });
import { scrapeLiveScore } from './src/lib/scraper';

(async () => {
  console.log('Testing Canada vs Bosnia...');
  const r1 = await scrapeLiveScore('Canada', 'Bosnia');
  console.log('R1:', r1);

  console.log('Testing Hàn Quốc vs CH Séc...');
  const r2 = await scrapeLiveScore('Hàn Quốc', 'CH Séc');
  console.log('R2:', r2);
})();
