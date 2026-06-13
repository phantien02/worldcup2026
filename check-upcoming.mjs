import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUpcoming() {
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*, home_team:home_team_id(name), away_team:away_team_id(name)')
    .eq('status', 'pending');
    
  if (error) {
    console.error(error);
    return;
  }
  
  const now = new Date().getTime();
  const upcoming = matches.filter(m => {
    const kickoffTime = new Date(m.kickoff_time).getTime();
    const diffHours = (kickoffTime - now) / (1000 * 60 * 60);
    return diffHours >= 0 && diffHours <= 12;
  });
  
  console.log(`Có ${upcoming.length} trận sắp diễn ra trong 12 giờ tới:`);
  upcoming.forEach(m => {
    console.log(`- ${m.home_team.name} vs ${m.away_team.name} | Thời gian: ${new Date(m.kickoff_time).toLocaleString('vi-VN')} (Giờ gốc: ${m.kickoff_time})`);
  });
}

checkUpcoming();
