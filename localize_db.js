require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

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
  'Honduras': 'Honduras', 'Costa Rica': 'Costa Rica', 'Jamaica': 'Jamaica', 'Oman': 'Oman', 'Bahrain': 'Bahrain'
};

async function run() {
  console.log("Fetching teams...");
  const { data: teams } = await supabase.from('teams').select('*');
  let updatedTeams = 0;
  for (const t of teams) {
      if (nameMap[t.name] && nameMap[t.name] !== t.name) {
          await supabase.from('teams').update({ name: nameMap[t.name] }).eq('id', t.id);
          updatedTeams++;
      }
  }
  console.log(`Updated ${updatedTeams} team names.`);

  console.log("Fetching matches...");
  const { data: matches } = await supabase.from('matches').select('*');
  let updatedMatches = 0;
  for (const m of matches) {
      if (m.round && m.round.includes('Group')) {
          const newRound = m.round.replace('Group', 'Bảng');
          await supabase.from('matches').update({ round: newRound }).eq('id', m.id);
          updatedMatches++;
      }
  }
  console.log(`Updated ${updatedMatches} match rounds.`);
}

run().catch(console.error);
