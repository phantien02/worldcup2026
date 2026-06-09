require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  // Try to query the exact same way the frontend does
  const { data: predsData, error } = await supabase
        .from('predictions')
        .select(`
          id, prediction_result, home_score, away_score, updated_at, user_id,
          advancing_team_id, predicted_win_method,
          profiles(display_name)
        `)
        .eq('match_id', 'c1d03d7d-6e2c-428c-a33c-2a53e43ac5cc');
        
  console.log("Error:", error);
  console.log("Data:", JSON.stringify(predsData, null, 2));
}

run();
