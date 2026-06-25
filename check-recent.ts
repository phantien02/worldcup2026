import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  const { data } = await supabase.from('matches').select('id, kickoff_time, status, home_score, away_score, home_team:home_team_id(name), away_team:away_team_id(name)');
  
  if (data) {
    const recent = data.filter(m => {
        const time = new Date(m.kickoff_time).getTime();
        // June 18th is 17817... something, let's just filter dates in June 18 and June 19
        const d = new Date(m.kickoff_time);
        return d.getUTCDate() >= 17 && d.getUTCDate() <= 19;
    });
    console.log(JSON.stringify(recent, null, 2));
  }
}
run();
