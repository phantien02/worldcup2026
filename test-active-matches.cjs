const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
  const now = Date.now();
  const { data: matches } = await supabaseAdmin.from('matches').select('id, kickoff_time, status, home_score, away_score, home_team:home_team_id(name), away_team:away_team_id(name)').in('status', ['pending', 'live']);
  
  const active = matches.filter(m => {
    const kickoff = new Date(m.kickoff_time).getTime();
    const diff = (now - kickoff) / 60000;
    return m.status === 'live' || (diff >= -15 && diff <= 240);
  });
  console.log('Active matches:');
  console.log(JSON.stringify(active, null, 2));
}

run();
