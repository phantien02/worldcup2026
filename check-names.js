const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function check() {
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, display_name').eq('display_name', 'Dungpn');
  console.log('Profiles for Dungpn:', profiles);
  
  if (profiles && profiles.length > 0) {
    const ids = profiles.map(p => p.id);
    const { data: preds } = await supabaseAdmin.from('predictions').select('match_id, home_score, away_score, user_id').in('user_id', ids);
    console.log('Predictions for these profiles:', preds);
  }
}

check();
