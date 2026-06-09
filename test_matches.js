require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data } = await supabase.from('matches').select('id, round, home_team:home_team_id(name), away_team:away_team_id(name)');
  console.log(JSON.stringify(data, null, 2));
  
  const { data: preds } = await supabase.from('predictions').select('*');
  console.log(JSON.stringify(preds, null, 2));
}

run();
