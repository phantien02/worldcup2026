const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data: match } = await supabase.from('matches').select('id').limit(1).single();
  if (!match) return console.log('No matches');
  
  const { data, error } = await supabase.from('matches').update({ status: 'deleted' }).eq('id', match.id);
  console.log('Update result:', error || 'Success');
  
  // Revert
  await supabase.from('matches').update({ status: 'pending' }).eq('id', match.id);
}
run();
