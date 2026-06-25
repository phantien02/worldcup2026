require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function calcStats() {
  const { data: profiles } = await supabase.from('profiles').select('display_name, total_points');
  
  const MAX_SO_FAR = 384; 
  const MAX_TOTAL = 1534; // 384 + 375 (25 * 15) + 775 (31 * 25)
  
  let forecastTotalPoints = 0;
  let maxForecast = 0;
  let minForecast = Infinity;
  let maxName = '';
  let minName = '';
  
  // Filter out the guest or players with 0 points if needed? 
  // Wait, guest has 0 points and will skew the lowest. The lowest active player is 102 points.
  // I will just calculate for everyone.
  
  const playersStats = profiles.map(p => {
    const captureRate = p.total_points / MAX_SO_FAR;
    const forecastScore = Math.round(captureRate * MAX_TOTAL);
    
    forecastTotalPoints += forecastScore;
    return { name: p.display_name, currentScore: p.total_points, forecastScore };
  });

  // Find min/max among non-guest players, or just all players.
  // Let's filter out 'guest' for a more accurate active player lowest score.
  const activePlayers = playersStats.filter(p => p.name !== 'guest');
  
  activePlayers.forEach(p => {
    if (p.forecastScore > maxForecast) { maxForecast = p.forecastScore; maxName = p.name; }
    if (p.forecastScore < minForecast) { minForecast = p.forecastScore; minName = p.name; }
  });
  
  const avgForecast = Math.round(forecastTotalPoints / profiles.length);
  const activeAvgForecast = Math.round(activePlayers.reduce((sum, p) => sum + p.forecastScore, 0) / activePlayers.length);
  
  console.log(`MAX_TOTAL: ${MAX_TOTAL}`);
  console.log(`AVG: ${activeAvgForecast}`);
  console.log(`MAX: ${maxName} - ${maxForecast}`);
  console.log(`MIN: ${minName} - ${minForecast}`);
}
calcStats();
