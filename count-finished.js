require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  const { data, error, count } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'finished');

  if (error) {
    console.error('Error fetching matches:', error);
  } else {
    console.log(`Số trận đã kết thúc (finished) là: ${count}`);
  }
})();
