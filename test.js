require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data } = await supabaseAdmin.from('profiles').select('id, display_name').limit(1);
  console.log('User:', data[0]);
  
  const userId = data[0].id;
  const res = await fetch(`http://localhost:3000/api/user-stats?userId=${userId}`);
  const json = await res.json();
  console.log('Stats:', json);
}

test().catch(console.error);
