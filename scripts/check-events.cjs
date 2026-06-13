require('dotenv').config({ path: '.env.local' });
const { supabaseAdmin } = require('../src/lib/supabase-server');

async function checkDB() {
  const { data, error } = await supabaseAdmin.from('matches').select('id, status, events, home_team:home_team_id(name), away_team:away_team_id(name)').eq('status', 'finished');
  console.log("Error:", error);
  console.log("Data:");
  data.forEach(d => console.log(`${d.home_team.name} vs ${d.away_team.name} | Status: ${d.status} | Events: ${JSON.stringify(d.events)}`));
}
checkDB();
