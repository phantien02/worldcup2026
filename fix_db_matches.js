require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const uuidv4 = crypto.randomUUID;

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  // 1. Insert Nhất bảng D
  const newTeamId = uuidv4();
  const { error: teamErr } = await supabase.from('teams').insert({
    id: newTeamId,
    name: 'Nhất bảng D',
    code: '1D',
    flag_url: 'https://flagcdn.com/w40/un.png',
    group_name: 'D'
  });
  if (teamErr) console.error("Error inserting team:", teamErr);
  else console.log("Inserted Nhất bảng D:", newTeamId);

  // 2. Update Match 81 (c1f5a56f-c57d-4393-b397-6ad8b4444e95) to use newTeamId
  const { error: updErr } = await supabase.from('matches').update({
    home_team_id: newTeamId
  }).eq('id', 'c1f5a56f-c57d-4393-b397-6ad8b4444e95');
  if (updErr) console.error("Error updating match:", updErr);
  else console.log("Updated Match 81");

  // Match 76 already inserted
  // ...
}

run();
