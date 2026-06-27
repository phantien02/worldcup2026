const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from('matches')
    .select('id, round, kickoff_time, home_team:home_team_id(name), away_team:away_team_id(name)')
    .eq('round', 'Vòng 32 đội')
    .order('kickoff_time', { ascending: true });
  console.log(JSON.stringify(data, null, 2));
}
run();
