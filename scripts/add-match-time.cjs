require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { query: `ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS match_time VARCHAR(50);` });
  console.log("RPC Error (if exec_sql doesn't exist):", error);
  
  if (error) {
    // If we don't have an exec_sql rpc, we can't alter table via REST API directly.
    console.log("You might need to execute this SQL in the Supabase Dashboard: ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS match_time VARCHAR(50);");
  }
}
run();
