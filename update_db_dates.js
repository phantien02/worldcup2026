require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { createClient } = require('@supabase/supabase-js');

const html = fs.readFileSync('C:\\Users\\tienpc1\\.gemini\\antigravity\\brain\\181cf735-deea-4d7f-9908-4ddb4ba70988\\.system_generated\\steps\\2671\\content.md', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

// Find all footballbox divs
const footballBoxes = document.querySelectorAll('.footballbox');

const parsedMatches = [];

footballBoxes.forEach(box => {
  const fevent = box.querySelector('.fevent');
  if (!fevent) return;
  
  const homeNode = fevent.querySelector('.fhome');
  const awayNode = fevent.querySelector('.faway');
  const scoreNode = fevent.querySelector('.fscore');
  
  if (!homeNode || !awayNode || !scoreNode) return;
  
  let home = homeNode.textContent.trim().replace(/\s+/g, ' ');
  let away = awayNode.textContent.trim().replace(/\s+/g, ' ');
  let matchNumText = scoreNode.textContent.trim();
  
  // Wikipedia bug: Match 81 has "Nhất bảng G" instead of "Nhất bảng D".
  if (matchNumText === "Trận 81" && home === "Nhất bảng G") {
     home = "Nhất bảng D";
  }

  // Get date
  const dateNode = box.querySelector('.fdate .bday');
  let dateStr = '';
  if (dateNode) {
     dateStr = dateNode.textContent.trim(); // e.g. "2026-06-11"
  } else {
     // fallback if .bday is missing
     const fdate = box.querySelector('.fdate');
     if (fdate) dateStr = fdate.textContent.trim();
  }

  // Get time
  const ftime = box.querySelector('.ftime');
  let timeStr = '00:00';
  let timezoneOffset = 0; // UTC
  
  if (ftime) {
      let tText = ftime.textContent.trim();
      const timeMatch = tText.match(/(\d{1,2}:\d{2})/);
      if (timeMatch) timeStr = timeMatch[1].padStart(5, '0');
      
      // Match ASCII minus, Unicode minus, or plus
      const tzMatch = tText.match(/UTC([+\-−])(\d+)/);
      if (tzMatch) {
         const sign = tzMatch[1] === '+' ? 1 : -1;
         timezoneOffset = sign * parseInt(tzMatch[2], 10);
      }
  }

  let isoString = '';
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
     const tzSign = timezoneOffset >= 0 ? '+' : '-';
     const tzHours = String(Math.abs(timezoneOffset)).padStart(2, '0');
     const tzSuffix = `${tzSign}${tzHours}:00`;
     try {
       isoString = new Date(`${dateStr}T${timeStr}:00${tzSuffix}`).toISOString();
     } catch(e) {
       console.log("Invalid date construction:", `${dateStr}T${timeStr}:00${tzSuffix}`);
     }
  } else {
     console.log("Could not parse date:", dateStr);
  }

  parsedMatches.push({
     home,
     away,
     matchNumText,
     isoString
  });
});

console.log(`Parsed ${parsedMatches.length} matches from Wiki.`);

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  // Fetch all teams
  const { data: teams } = await supabase.from('teams').select('id, name');
  const teamMap = {};
  teams.forEach(t => teamMap[t.name] = t.id);

  // Fetch all matches
  const { data: matches } = await supabase.from('matches').select('id, home_team_id, away_team_id');
  
  const aliasMap = {
     "México": "Mexico",
     "Séc": "CH Séc",
     "Bosna và Hercegovina": "Bosnia",
     "Brasil": "Brazil",
     "Hoa Kỳ": "Mỹ",
     "Curaçao": "Curacao",
     "Cabo Verde": "Cape Verde",
     "Sénégal": "Senegal",
     "Algérie": "Algeria",
     "Ả Rập Xê Út": "Saudi Arabia",
     "Maroc": "Marocco",
     "Panamá": "Panama"
  };

  // Let's match them up
  let updatedCount = 0;
  for (const pm of parsedMatches) {
     const dbHome = aliasMap[pm.home] || pm.home;
     const dbAway = aliasMap[pm.away] || pm.away;
     
     const homeId = teamMap[dbHome];
     const awayId = teamMap[dbAway];
     if (!homeId || !awayId) {
        console.log(`Cannot find team IDs for: ${dbHome} vs ${dbAway}`);
        continue;
     }

     const match = matches.find(m => m.home_team_id === homeId && m.away_team_id === awayId);
     if (match) {
        // Update database
        if (pm.isoString) {
           const { error } = await supabase.from('matches').update({
              kickoff_time: pm.isoString
           }).eq('id', match.id);
           
           if (error) console.error("Error updating match", match.id, error);
           else updatedCount++;
        }
     } else {
        console.log(`Match not found in DB: ${pm.home} vs ${pm.away}`);
     }
  }

  console.log(`Successfully updated ${updatedCount} matches with Wiki date & time.`);
}

run();
