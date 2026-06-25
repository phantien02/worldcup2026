require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function forecast() {
  const { data: profiles } = await supabase.from('profiles').select('display_name, total_points');
  
  const PLAYERS_COUNT = profiles.length;
  const INITIAL_FEE = 1155000;
  const GOAL_AVG = 500000;
  
  const MAX_SO_FAR = 384; 
  const MAX_TOTAL = 1155;
  
  let currentTotalPoints = 0;
  let forecastTotalPoints = 0;
  
  const playersStats = profiles.map(p => {
    const captureRate = p.total_points / MAX_SO_FAR;
    const forecastScore = Math.round(captureRate * MAX_TOTAL);
    const currentRevenue = INITIAL_FEE - (p.total_points * 1000);
    const forecastRevenue = INITIAL_FEE - (forecastScore * 1000);
    
    currentTotalPoints += p.total_points;
    forecastTotalPoints += forecastScore;
    
    return {
      name: p.display_name,
      currentScore: p.total_points,
      forecastScore,
      playerProfit: (forecastScore * 1000) - INITIAL_FEE,
      btcRevenue: forecastRevenue
    };
  }).sort((a, b) => b.forecastScore - a.forecastScore);
  
  const currentBtcRevenue = (PLAYERS_COUNT * INITIAL_FEE) - (currentTotalPoints * 1000);
  const forecastBtcRevenue = (PLAYERS_COUNT * INITIAL_FEE) - (forecastTotalPoints * 1000);
  const avgForecastRevenue = forecastBtcRevenue / PLAYERS_COUNT;
  
  console.log('--- TỔNG QUAN ---');
  console.log(`Số người chơi: ${PLAYERS_COUNT}`);
  console.log(`Doanh thu BTC HIỆN TẠI: ${currentBtcRevenue.toLocaleString('vi-VN')} VND`);
  console.log(`Doanh thu BTC DỰ KIẾN (Cuối mùa): ${forecastBtcRevenue.toLocaleString('vi-VN')} VND`);
  console.log(`Trung bình BTC thu về/người (Dự kiến): ${Math.round(avgForecastRevenue).toLocaleString('vi-VN')} VND/người`);
  console.log(`Mục tiêu 500k/người: ${avgForecastRevenue >= GOAL_AVG ? 'KHẢ THI' : 'KHÔNG KHẢ THI'}`);
}
forecast();
