import { config } from 'dotenv';
config({ path: '.env.local' });
import { supabaseAdmin } from './src/lib/supabase-server';

async function run() {
  const { data } = await supabaseAdmin
    .from('matches')
    .select('id, home_team:home_team_id(name), away_team:away_team_id(name), status')
    .eq('status', 'live');
  console.log(JSON.stringify(data, null, 2));
}
run();
