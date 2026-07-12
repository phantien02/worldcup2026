require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const { data: teams } = await supabase.from('teams').select('id, name');
  const portugal = teams.find(t => t.name === 'Bồ Đào Nha');
  const spain = teams.find(t => t.name === 'Tây Ban Nha');
  
  const { data: matches, error } = await supabase.from('matches').select('id, home_team_id, away_team_id, kickoff_time, round');
  
  const targetMatches = matches.filter(m => 
    (m.home_team_id === portugal.id && m.away_team_id === spain.id) || 
    (m.home_team_id === spain.id && m.away_team_id === portugal.id)
  );
  
  console.log('Matches between Portugal and Spain:', targetMatches);
}

run();
