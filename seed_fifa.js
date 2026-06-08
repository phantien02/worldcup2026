require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const flagMap = {
  'Việt Nam': 'vn', 'Thái Lan': 'th', 'Argentina': 'ar', 'France': 'fr', 'Brazil': 'br', 
  'England': 'gb-eng', 'Germany': 'de', 'Spain': 'es', 'Portugal': 'pt', 'Netherlands': 'nl', 
  'Belgium': 'be', 'Italy': 'it', 'USA': 'us', 'Mexico': 'mx', 'Canada': 'ca', 'Japan': 'jp', 
  'Korea Republic': 'kr', 'Australia': 'au', 'Saudi Arabia': 'sa', 'South Africa': 'za', 'Senegal': 'sn', 
  'Morocco': 'ma', 'Cameroon': 'cm', 'Ghana': 'gh', 'Uruguay': 'uy', 'Colombia': 'co', 
  'Chile': 'cl', 'Paraguay': 'py', 'Switzerland': 'ch', 'Sweden': 'se', 'Poland': 'pl', 
  'Denmark': 'dk', 'Croatia': 'hr', 'Serbia': 'rs', 'Wales': 'gb-wls', 'Scotland': 'gb-sct', 
  'Czechia': 'cz', 'Ecuador': 'ec', 'Tunisia': 'tn', 'Haiti': 'ht', 'Curaçao': 'cw', 
  'Bosnia and Herzegovina': 'ba', 'Türkiye': 'tr', 'Cabo Verde': 'cv', 'Egypt': 'eg', 'Qatar': 'qa', 
  'Norway': 'no', 'Iraq': 'iq', 'New Zealand': 'nz', 'IR Iran': 'ir', 'Austria': 'at', 'Jordan': 'jo', 
  'Uzbekistan': 'uz', 'Panama': 'pa', 'Nigeria': 'ng', 'Mali': 'ml', 'Algeria': 'dz',
  'Côte d\'Ivoire': 'ci', 'Burkina Faso': 'bf', 'Peru': 'pe', 'Venezuela': 've',
  'Honduras': 'hn', 'Costa Rica': 'cr', 'Jamaica': 'jm', 'Oman': 'om', 'Bahrain': 'bh'
};

async function run() {
  const matches = JSON.parse(fs.readFileSync('parsed_fifa.json', 'utf8'));
  
  console.log("Deleting old matches...");
  await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
  
  // Update or insert teams
  const uniqueTeams = new Set();
  for (const m of matches) {
      uniqueTeams.add(m.home);
      uniqueTeams.add(m.away);
  }
  
  console.log("Upserting teams...");
  for (const t of uniqueTeams) {
      const code = flagMap[t] || flagMap[t.replace(' ', '')] || 'un';
      let flag_url = null;
      if (code !== 'un') {
          flag_url = `https://flagcdn.com/w80/${code}.png`;
      } else {
          // try to search existing Wikipedia ones
          const {data: existing} = await supabase.from('teams').select('flag_url').eq('name', t).maybeSingle();
          if (existing && existing.flag_url) flag_url = existing.flag_url;
      }
      
      const { data: teamData } = await supabase.from('teams').select('id').eq('name', t).maybeSingle();
      if (!teamData) {
          await supabase.from('teams').insert({ name: t, flag_url: flag_url });
      } else if (flag_url) {
          await supabase.from('teams').update({ flag_url: flag_url }).eq('name', t);
      }
  }
  
  // Re-fetch teams to get IDs
  const { data: dbTeams } = await supabase.from('teams').select('id, name');
  const teamMap = {};
  for (const dt of dbTeams) teamMap[dt.name] = dt.id;
  
  console.log("Inserting new FIFA matches...");
  const insertData = matches.map(m => {
      // Date format: "Friday 12 June 2026", Time: "02:00" -> ISO
      const dateStr = m.date.split(' ').slice(1).join(' '); // "12 June 2026"
      const dateObj = new Date(`${dateStr} ${m.time} UTC`); // assume UTC or local, let's just parse it
      // FIFA times are likely in the timezone of the user or local to the stadium, but let's just combine them for visual parity
      
      return {
          home_team_id: teamMap[m.home],
          away_team_id: teamMap[m.away],
          kickoff_time: dateObj.toISOString(),
          round: m.round
      };
  });
  
  const { error } = await supabase.from('matches').insert(insertData);
  if (error) {
      console.error("Error inserting matches:", error);
  } else {
      console.log(`Successfully inserted ${insertData.length} matches from FIFA.`);
  }
}

run().catch(console.error);
