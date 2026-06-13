require('dotenv').config({ path: '.env.local' });
const { supabaseAdmin } = require('../src/lib/supabase-server');
const { scrapeLiveScore } = require('../src/lib/scraper');

async function runBackfill() {
  console.log("Đang lấy danh sách các trận đã kết thúc chưa có dữ liệu events...");
  const { data: matches, error } = await supabaseAdmin
    .from('matches')
    .select('id, home_team:home_team_id(name), away_team:away_team_id(name)')
    .eq('status', 'finished')
    .is('events', null);

  if (error) {
    console.error("Lỗi lấy danh sách:", error);
    return;
  }

  if (!matches || matches.length === 0) {
    console.log("Không có trận đấu nào cần backfill.");
    return;
  }

  console.log(`Tìm thấy ${matches.length} trận đấu cần backfill.`);

  for (const match of matches) {
    const homeName = (match.home_team as any)?.name;
    const awayName = (match.away_team as any)?.name;
    console.log(`\nĐang cào dữ liệu trận: ${homeName} vs ${awayName}...`);
    
    try {
      const result = await scrapeLiveScore(homeName, awayName);
      if (result && result.events) {
        console.log(`Đã tìm thấy events cho trận đấu. Đang lưu DB...`);
        const { error: updateError } = await supabaseAdmin
          .from('matches')
          .update({ events: result.events })
          .eq('id', match.id);
        
        if (updateError) {
          console.error(`Lỗi cập nhật DB trận ${match.id}:`, updateError);
        } else {
          console.log(`Cập nhật thành công!`);
        }
      } else {
        console.log(`AI không tìm thấy events hoặc kết quả rỗng cho trận này.`);
      }
    } catch (err) {
      console.error(`Lỗi cào dữ liệu trận ${homeName} vs ${awayName}:`, err);
    }
    
    // Đợi 2s để tránh vượt quá Rate Limit của model
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log("\nHoàn tất backfill!");
}

runBackfill();
