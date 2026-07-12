require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function generateMapping() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const { data: matches } = await supabase.from('matches').select('id, home_team_id, away_team_id, round');
  const { data: teams } = await supabase.from('teams').select('id, name');
  
  const teamMap = {};
  teams.forEach(t => teamMap[t.id] = t.name);
  
  const matchMapping = require('./src/data/matchMapping.json');
  const idMapping = {};
  
  matches.forEach(m => {
    const homeName = teamMap[m.home_team_id];
    const awayName = teamMap[m.away_team_id];
    
    // Look up in existing mapping
    const matchName = matchMapping[`${homeName} vs ${awayName}`] || matchMapping[`${awayName} vs ${homeName}`];
    
    if (matchName) {
      idMapping[m.id] = matchName;
    } else {
      // If not found (e.g. because teams changed), maybe we can guess by looking at other placeholders?
      // Since some matches have changed (like Match 93 is now Portugal vs Spain), 
      // let's manually add them if we know them.
    }
  });
  
  console.log('ID mapping size:', Object.keys(idMapping).length);
  fs.writeFileSync('./matchIdMapping.json', JSON.stringify(idMapping, null, 2));
}

generateMapping();
