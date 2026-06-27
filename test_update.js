const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from('matches')
    .update({ home_team_id: '43e0ee09-8aaf-4d93-bd84-ca3103865ab3' })
    .eq('id', '32455a36-a8b1-45ea-93a7-41d584ebbaab') // Match 4: Hà Lan vs Maroc (I am just testing update)
    .select();
  
  if (error) console.error("Error:", error);
  else console.log("Success:", data);
}
run();
