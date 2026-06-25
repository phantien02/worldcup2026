import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from './src/lib/supabase-server';

async function check() {
  const { data, error } = await supabaseAdmin.from('matches').select('id, kickoff_time, home_team_id, away_team_id');
  if (error) console.error(error);
  console.log(data?.slice(0, 50));
}
check();
