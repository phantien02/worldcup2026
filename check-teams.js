const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeams() {
  const { data: teams } = await supabase.from('teams').select('*');
  if (teams) {
    teams.forEach(t => {
      if (t.name.toLowerCase().includes('mor') || t.name.toLowerCase().includes('haiti') || t.name.toLowerCase().includes('ma rốc') || t.name.toLowerCase().includes('mar')) {
        console.log(`Team: ${t.name}`);
      }
    });
  }
}
checkTeams();
