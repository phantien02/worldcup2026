const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase
       .from('predictions')
       .select('*, match:matches(*, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name))')
       .limit(1);
  console.log(error || data);
}
run();
