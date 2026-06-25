require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function calc() {
  const { data: profiles } = await supabase.from('profiles').select('id, display_name, total_points');
  
  if (!profiles || profiles.length === 0) {
    console.log("No profiles found.");
    return;
  }
  
  // Sort by points to find the max points achieved
  profiles.sort((a, b) => b.total_points - a.total_points);
  
  const topScore = profiles[0].total_points;
  const theoreticalMax = 384; // 48 matches * 8 points
  
  let totalDiffFromTop = 0;
  let totalDiffFromTheoretical = 0;
  
  profiles.forEach(p => {
    totalDiffFromTop += (topScore - p.total_points);
    totalDiffFromTheoretical += (theoreticalMax - p.total_points);
  });
  
  console.log(`Number of players: ${profiles.length}`);
  console.log(`Top score achieved: ${topScore}`);
  console.log(`Revenue (Diff from Top): ${totalDiffFromTop * 1000} VND`);
  console.log(`Revenue (Diff from Theoretical Max 384): ${totalDiffFromTheoretical * 1000} VND`);
  
  // Let's print out some stats to make sure it's accurate
  console.log(`Player scores: ${profiles.map(p => p.total_points).join(', ')}`);
}
calc();
