const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data: teams } = await supabase.from('teams').select('id, name');
  const morocco = teams.find(t => t.name.toLowerCase().includes('mor') || t.name.toLowerCase().includes('mar'));
  const bosnia = teams.find(t => t.name.toLowerCase().includes('bos'));
  console.log("Morocco:", morocco);
  console.log("Bosnia:", bosnia);
}
run();
