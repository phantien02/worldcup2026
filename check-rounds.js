require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data: matches } = await supabase.from('matches').select('id, round');
  
  const rounds = {};
  matches.forEach(m => {
    rounds[m.round] = (rounds[m.round] || 0) + 1;
  });
  
  console.log(rounds);
}
check();
