const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data: user } = await supabase.from('profiles').select('id').limit(1).single();
  const { data: match } = await supabase.from('matches').select('id').limit(1).single();
  if(!user || !match) return console.log('No user or match');

  // Insert prediction
  const { error: err1 } = await supabase.from('predictions').insert({
      user_id: user.id, match_id: match.id, home_score: 1, away_score: 1
  });
  console.log('Insert pred:', err1 ? err1.message : 'ok');

  // Delete match
  const { error: err2 } = await supabase.from('matches').delete().eq('id', match.id);
  console.log('Delete match:', err2 ? err2.message : 'ok');

  // Check prediction
  const { data: preds } = await supabase.from('predictions').select('*').eq('match_id', match.id);
  console.log('Predictions after delete:', preds);
}
run();
