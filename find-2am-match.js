require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  const { data, error } = await supabase
    .from('matches')
    .select('*, home:teams!home_team_id(name), away:teams!away_team_id(name)')
    .order('kickoff_time', { ascending: true });

  if (error) {
    console.error('Error fetching matches:', error);
  } else {
    console.log('--- Các trận đấu xung quanh 2h sáng (Giờ Việt Nam) ---');
    data.forEach(m => {
      // Chuyển kickoff_time sang giờ Việt Nam
      const utcDate = new Date(m.kickoff_time);
      const vnTime = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);
      
      // Nếu giờ VN là 2 (2h sáng)
      if (vnTime.getUTCHours() === 2) {
        console.log(`- Trận đấu: ${m.home?.name || 'N/A'} vs ${m.away?.name || 'N/A'} | Thời gian (VN): ${vnTime.toISOString().replace('T', ' ').substring(0, 16)} | Trạng thái: ${m.status}`);
      }
    });
  }
})();
