require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  // Login as test_user_1
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test_user_1@test.com',
    password: 'password123'
  });
  
  if (authError) {
    console.error("Login failed:", authError.message);
    // try to fetch without login
  }

  const { data: preds } = await supabase
    .from('predictions')
    .select(`id, prediction_result, home_score, away_score, updated_at, user_id`)
    .eq('match_id', 'c1d03d7d-6e2c-428c-a33c-2a53e43ac5cc');
    
  console.log("Predictions for test_user_1:");
  console.log(JSON.stringify(preds, null, 2));
}

run();
