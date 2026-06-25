import { config } from 'dotenv';
config({ path: '.env.local' });
import { supabaseAdmin } from './src/lib/supabase-server';

async function run() {
  const { data, error } = await supabaseAdmin.from('matches').select('id, status, home_team_id').eq('status', 'live');
  if (error) console.error('ERROR:', error);
  console.log('DATA:', data);
  process.exit(0);
}
run();
