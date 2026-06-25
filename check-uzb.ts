import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error } = await supabase.from('matches').select('id, kickoff_time, status, home_score, away_score, round, home_team:home_team_id(name), away_team:away_team_id(name)');
  
  if (error) console.error(error);
  const uzb = data?.filter(m => (m.home_team as any).name.includes('Uzbek') || (m.away_team as any).name.includes('Uzbek') || (m.away_team as any).name.includes('Colom') || (m.home_team as any).name.includes('Colom'));
  console.log(JSON.stringify(uzb, null, 2));
}
run();
