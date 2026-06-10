require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const matchMapping = require('./src/data/matchMapping.json');

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const { data: matches } = await supabase
    .from('matches')
    .select('id, kickoff_time, home_team:home_team_id(name), away_team:away_team_id(name)');
    
  if (!matches) {
     console.error("No matches found");
     return;
  }
  
  const report = [];
  
  for (const match of matches) {
     const home = match.home_team.name;
     const away = match.away_team.name;
     
     let matchNumText = matchMapping[`${home} vs ${away}`];
     if (!matchNumText) {
        matchNumText = "Chưa có mapping";
     }
     
     // Extract number from "Trận XX"
     let matchNum = 999;
     const matchExtract = matchNumText.match(/Trận (\d+)/i);
     if (matchExtract) {
        matchNum = parseInt(matchExtract[1], 10);
     }
     
     // Convert UTC to VN Time (UTC+7)
     const date = new Date(match.kickoff_time);
     // Format strictly in VN time
     const options = { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
     const vnTimeStr = date.toLocaleString('vi-VN', options).replace(',', '');
     
     report.push({
        matchNumText,
        matchNum,
        home,
        away,
        time: vnTimeStr,
        utc: match.kickoff_time
     });
  }
  
  // Sort by match number
  report.sort((a, b) => a.matchNum - b.matchNum);
  
  let md = "# Thống kê Lịch thi đấu World Cup 2026 (Giờ Việt Nam UTC+7)\n\n";
  md += "| Trận | Đội nhà | Đội khách | Giờ VN (UTC+7) | Giờ hệ thống (UTC) |\n";
  md += "| :--- | :--- | :--- | :--- | :--- |\n";
  
  for (const r of report) {
     md += `| ${r.matchNumText} | ${r.home} | ${r.away} | **${r.time}** | ${r.utc} |\n`;
  }
  
  // Also write to an artifact in the user's brain directory
  const artifactPath = 'C:\\Users\\tienpc1\\.gemini\\antigravity\\brain\\181cf735-deea-4d7f-9908-4ddb4ba70988\\match_schedule_report.md';
  fs.writeFileSync(artifactPath, md);
  
  console.log(`Generated report with ${report.length} matches.`);
}

run();
