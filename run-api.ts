import { config } from 'dotenv';
config({ path: '.env.local' });

import { GET } from './src/app/api/live/route';

async function run() {
  console.log('Running API locally to update Supabase...');
  try {
    const res = await GET();
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Error running API:', err);
  }
}

run();
