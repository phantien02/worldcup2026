require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function calc() {
  const { data: matches } = await supabase.from('matches').select('id, kickoff_time, round');
  
  const NEW_RULE_CUTOFF = new Date('2026-06-24T17:00:00Z').getTime();
  const knockoutRounds = ['Vòng 32 đội', 'Vòng 16 đội', 'Tứ kết', 'Bán kết', 'Tranh hạng 3', 'Chung kết'];
  
  let oldGroup = 0;
  let newGroup = 0;
  let oldKO = 0;
  let newKO = 0;
  
  matches.forEach(m => {
    const isKnockout = knockoutRounds.includes(m.round);
    const time = new Date(m.kickoff_time).getTime();
    const isNew = time >= NEW_RULE_CUTOFF;
    
    if (isKnockout) {
      if (isNew) newKO++; else oldKO++;
    } else {
      if (isNew) newGroup++; else oldGroup++;
    }
  });
  
  console.log('Total:', matches.length);
  console.log('Old group:', oldGroup, 'New group:', newGroup, 'Old KO:', oldKO, 'New KO:', newKO);
}
calc();
