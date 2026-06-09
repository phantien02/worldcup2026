require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, round, home_team:home_team_id(name), away_team:away_team_id(name)')
    .eq('round', 'Vòng 32 đội');
    
  if (error) {
    console.error(error);
  } else {
    console.log(`Found ${matches.length} matches in Vòng 32 đội`);
    console.log(JSON.stringify(matches, null, 2));
  }
}

run();
