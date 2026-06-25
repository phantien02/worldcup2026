import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase.from('matches').select('id, kickoff_time, status, home_score, away_score, round, home_team:home_team_id(name), away_team:away_team_id(name)');
  
  // Tìm trận Argentina
  const match = data?.find(m => (m.home_team as any).name.includes('Argentin') || (m.away_team as any).name.includes('Argentin'));
  console.log('=== TRẬN ARGENTINA TRONG DB ===');
  console.log(JSON.stringify(match, null, 2));
}
run();
