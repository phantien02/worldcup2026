require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const nameMap = {
  'Việt Nam': 'Việt Nam', 'Thái Lan': 'Thái Lan', 'Argentina': 'Argentina', 'France': 'Pháp', 'Brazil': 'Brazil', 
  'England': 'Anh', 'Germany': 'Đức', 'Spain': 'Tây Ban Nha', 'Portugal': 'Bồ Đào Nha', 'Netherlands': 'Hà Lan', 
  'Belgium': 'Bỉ', 'Italy': 'Ý', 'USA': 'Mỹ', 'Mexico': 'Mexico', 'Canada': 'Canada', 'Japan': 'Nhật Bản', 
  'Korea Republic': 'Hàn Quốc', 'Australia': 'Úc', 'Saudi Arabia': 'Saudi Arabia', 'South Africa': 'Nam Phi', 'Senegal': 'Senegal', 
  'Morocco': 'Ma-rốc', 'Cameroon': 'Cameroon', 'Ghana': 'Ghana', 'Uruguay': 'Uruguay', 'Colombia': 'Colombia', 
  'Chile': 'Chile', 'Paraguay': 'Paraguay', 'Switzerland': 'Thụy Sĩ', 'Sweden': 'Thụy Điển', 'Poland': 'Ba Lan', 
  'Denmark': 'Đan Mạch', 'Croatia': 'Croatia', 'Serbia': 'Serbia', 'Wales': 'Xứ Wales', 'Scotland': 'Scotland', 
  'Czechia': 'CH Séc', 'Ecuador': 'Ecuador', 'Tunisia': 'Tunisia', 'Haiti': 'Haiti', 'Curaçao': 'Curacao', 
  'Bosnia and Herzegovina': 'Bosnia', 'Türkiye': 'Thổ Nhĩ Kỳ', 'Cabo Verde': 'Cabo Verde', 'Egypt': 'Ai Cập', 'Qatar': 'Qatar', 
  'Norway': 'Na Uy', 'Iraq': 'Iraq', 'New Zealand': 'New Zealand', 'IR Iran': 'Iran', 'Austria': 'Áo', 'Jordan': 'Jordan', 
  'Uzbekistan': 'Uzbekistan', 'Panama': 'Panama', 'Nigeria': 'Nigeria', 'Mali': 'Mali', 'Algeria': 'Algeria',
  'Côte d\'Ivoire': 'Bờ Biển Ngà', 'Burkina Faso': 'Burkina Faso', 'Peru': 'Peru', 'Venezuela': 'Venezuela',
  'Honduras': 'Honduras', 'Costa Rica': 'Costa Rica', 'Jamaica': 'Jamaica', 'Oman': 'Oman', 'Bahrain': 'Bahrain',
  'Congo DR': 'CHDC Congo'
};

const flagMap = {
  'Ma-rốc': 'ma', 'CHDC Congo': 'cd', 'Hàn Quốc': 'kr', 'CH Séc': 'cz', 'Bosnia': 'ba', 'Curacao': 'cw', 'Mỹ': 'us',
  'Pháp': 'fr', 'Hà Lan': 'nl', 'Anh': 'gb-eng', 'Đức': 'de', 'Tây Ban Nha': 'es', 'Bồ Đào Nha': 'pt', 'Bỉ': 'be', 'Ý': 'it',
  'Thụy Sĩ': 'ch', 'Thụy Điển': 'se', 'Ba Lan': 'pl', 'Đan Mạch': 'dk', 'Croatia': 'hr', 'Serbia': 'rs', 'Ai Cập': 'eg',
  'Nhật Bản': 'jp', 'Thái Lan': 'th', 'Việt Nam': 'vn', 'Nam Phi': 'za', 'Úc': 'au', 'Saudi Arabia': 'sa',
  'Thổ Nhĩ Kỳ': 'tr', 'Cabo Verde': 'cv', 'Bờ Biển Ngà': 'ci', 'Mexico': 'mx', 'Canada': 'ca', 'Paraguay': 'py', 'Qatar': 'qa'
};

async function getOrInsertTeam(teamMap, name) {
    if (teamMap[name]) return teamMap[name];
    
    // check if it exists in DB just in case
    const { data: existing } = await supabase.from('teams').select('id').eq('name', name).maybeSingle();
    if (existing) {
        teamMap[name] = existing.id;
        return existing.id;
    }
    
    // insert
    const code = flagMap[name] || 'un';
    const { data, error } = await supabase.from('teams').insert({name: name, code: code.toUpperCase(), flag_url: `https://flagcdn.com/w80/${code}.png`}).select('id').single();
    if (error || !data) {
        console.log("Failed to insert", name, error);
        return null;
    }
    teamMap[name] = data.id;
    return data.id;
}

async function run() {
  const matches = JSON.parse(fs.readFileSync('parsed_fifa.json', 'utf8'));
  
  console.log("Deleting old matches...");
  await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  const { data: dbTeams } = await supabase.from('teams').select('id, name');
  const teamMap = {};
  for (const dt of dbTeams) {
    teamMap[dt.name] = dt.id;
    if (dt.name === 'Marocco') teamMap['Ma-rốc'] = dt.id;
    if (dt.name === 'Congo DR') teamMap['CHDC Congo'] = dt.id;
    if (dt.name === 'Ai Cập') teamMap['Ai Cập'] = dt.id;
  }
  
  console.log("Inserting new FIFA matches...");
  const insertData = [];
  
  for (const m of matches) {
      const homeVi = nameMap[m.home] || m.home;
      const awayVi = nameMap[m.away] || m.away;
      
      const homeId = await getOrInsertTeam(teamMap, homeVi);
      const awayId = await getOrInsertTeam(teamMap, awayVi);
      
      const dateStr = m.date.split(' ').slice(1).join(' '); // "12 June 2026"
      const dateObj = new Date(`${dateStr} ${m.time} GMT+0700`);
      const roundVi = m.round.replace('Group', 'Bảng');
      
      // If team ID is still null for some reason, don't insert match with null teams, it causes TBD.
      // Wait, FIFA actually doesn't have TBD! My parsing failed because teams were missing ID!
      if (!homeId || !awayId) {
          console.error(`Skipping match due to missing team ID: ${homeVi} vs ${awayVi}`);
          continue;
      }
      
      insertData.push({
          home_team_id: homeId,
          away_team_id: awayId,
          kickoff_time: dateObj.toISOString(), 
          round: roundVi
      });
  }
  
  const { error } = await supabase.from('matches').insert(insertData);
  if (error) {
      console.error("Error inserting matches:", error);
  } else {
      console.log(`Successfully inserted ${insertData.length} matches.`);
  }
}

run().catch(console.error);
