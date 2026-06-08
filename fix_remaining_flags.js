require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const flagMap = {
  'Việt Nam': 'vn', 'Thái Lan': 'th', 'Argentina': 'ar', 'Pháp': 'fr', 'Brazil': 'br', 
  'Anh': 'gb-eng', 'Đức': 'de', 'Tây Ban Nha': 'es', 'Bồ Đào Nha': 'pt', 'Hà Lan': 'nl', 
  'Bỉ': 'be', 'Ý': 'it', 'Mỹ': 'us', 'Mexico': 'mx', 'Canada': 'ca', 'Nhật Bản': 'jp', 
  'Hàn Quốc': 'kr', 'Úc': 'au', 'Saudi Arabia': 'sa', 'Nam Phi': 'za', 'Senegal': 'sn', 
  'Marocco': 'ma', 'Cameroon': 'cm', 'Ghana': 'gh', 'Uruguay': 'uy', 'Colombia': 'co', 
  'Chile': 'cl', 'Paraguay': 'py', 'Thụy Sĩ': 'ch', 'Thụy Điển': 'se', 'Ba Lan': 'pl', 
  'Đan Mạch': 'dk', 'Croatia': 'hr', 'Serbia': 'rs', 'Xứ Wales': 'gb-wls', 'Scotland': 'gb-sct', 
  'CH Séc': 'cz', 'Ecuador': 'ec', 'Tunisia': 'tn', 'Haiti': 'ht', 'Curacao': 'cw', 
  'Bosnia': 'ba', 'Thổ Nhĩ Kỳ': 'tr', 'Cabo Verde': 'cv', 'Ai Cập': 'eg', 'Qatar': 'qa', 
  'Na Uy': 'no', 'Iraq': 'iq', 'New Zealand': 'nz', 'Iran': 'ir', 'Áo': 'at', 'Jordan': 'jo', 
  'Uzbekistan': 'uz', 'Panama': 'pa', 'Nigeria': 'ng', 'Mali': 'ml', 'Algeria': 'dz',
  'Ivory Coast': 'ci', 'Bờ Biển Ngà': 'ci', 'Burkina Faso': 'bf'
};

async function run() {
  const { data: teams } = await supabase.from('teams').select('*');
  let updated = 0;

  for (const team of teams) {
    // If flag is missing, or it's an emoji (which isn't stored in DB, but flag_url would be null)
    if (!team.flag_url) {
       const code = flagMap[team.name];
       if (code) {
          const url = `https://flagcdn.com/w80/${code}.png`;
          await supabase.from('teams').update({ flag_url: url }).eq('id', team.id);
          console.log(`Updated ${team.name} -> ${url}`);
          updated++;
       } else {
          console.log(`NO MAPPING FOUND FOR: ${team.name}`);
       }
    }
  }
  
  // Actually, I'll just forcefully update Mexico to flagcdn because the user hated the emoji
  const mxUrl = `https://flagcdn.com/w80/mx.png`;
  await supabase.from('teams').update({ flag_url: mxUrl }).eq('name', 'Mexico');
  console.log("Forced Mexico to", mxUrl);
  
  console.log(`Finished updating ${updated} teams.`);
}

run();
