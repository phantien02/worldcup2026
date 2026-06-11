require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dumtfmusjlfeoxkewgru.supabase.co';
// BẢO MẬT: Đã thay thế chuỗi khóa cứng bằng biến môi trường
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const rawData = `
Vòng 32 đội
28 tháng 6 năm 2026
12:00 UTC−7
Nhì bảng A	Trận 73	Nhì bảng B
Chi tiết	
Sân vận động SoFi, Inglewood
29 tháng 6 năm 2026
12:00 UTC−5
Nhất bảng C	Trận 76	Nhì bảng F
Chi tiết	
Sân vận động NRG, Houston
30 tháng 6 năm 2026
16:30 UTC−4
Nhất bảng E	Trận 74	Thứ 3 bảng A/B/C/D/F
Chi tiết	
Sân vận động Gillette, Foxborough
29 tháng 6 năm 2026
19:00 UTC−6
Nhất bảng F	Trận 75	Nhì bảng C
Chi tiết	
Sân vận động BBVA, Guadalupe
30 tháng 6 năm 2026
12:00 UTC−5
Nhì bảng E	Trận 78	Nhì bảng I
Chi tiết	
Sân vận động AT&T, Arlington
30 tháng 6 năm 2026
17:00 UTC−4
Nhất bảng I	Trận 77	Thứ 3 bảng C/D/F/G/H
Chi tiết	
Sân vận động MetLife, Đông Rutherford
30 tháng 6 năm 2026
19:00 UTC−6
Nhất bảng A	Trận 79	Thứ 3 bảng C/E/F/H/I
Chi tiết	
Sân vận động Azteca, Thành phố México
1 tháng 7 năm 2026
12:00 UTC−4
Nhất bảng L	Trận 80	Thứ 3 bảng E/H/I/J/K
Chi tiết	
Sân vận động Mercedes-Benz, Atlanta
1 tháng 7 năm 2026
13:00 UTC−7
Nhất bảng G	Trận 82	Thứ 3 bảng A/E/H/I/J
Chi tiết	
Lumen Field, Seattle
1 tháng 7 năm 2026
17:00 UTC−7
Nhất bảng G	Trận 81	Thứ 3 bảng B/E/F/I/J
Chi tiết	
Sân vận động Levi's, Santa Clara
2 tháng 7 năm 2026
12:00 UTC−7
Nhất bảng H	Trận 84	Nhì bảng J
Chi tiết	
Sân vận động Levi's, Santa Clara
2 tháng 7 năm 2026
19:00 UTC−4
Nhì bảng K	Trận 83	Nhì bảng L
Chi tiết	
Sân vận động Levi's, Santa Clara
2 tháng 7 năm 2026
20:00 UTC−7
Nhất bảng B	Trận 85	Thứ 3 bảng E/F/G/I/J
Chi tiết	
BC Place, Vancouver
3 tháng 7 năm 2026
13:00 UTC−5
Nhì bảng D	Trận 88	Nhì bảng G
Chi tiết	
Sân vận động AT&T, Arlington
3 tháng 7 năm 2026
18:00 UTC−4
Nhất bảng J	Trận 86	Nhì bảng H
Chi tiết	
Sân vận động AT&T, Arlington
3 tháng 7 năm 2026
20:30 UTC−5
Nhất bảng K	Trận 87	Thứ 3 bảng D/E/I/J/L
Chi tiết	
Sân vận động Arrowhead, Kansas City
Vòng 16 đội
4 tháng 7 năm 2026
12:00 UTC−5
Thắng trận 73	Trận 90	Thắng trận 75
Chi tiết	
Sân vận động NRG, Houston
4 tháng 7 năm 2026
17:00 UTC−4
Thắng trận 74	Trận 89	Thắng trận 77
Chi tiết	
Lincoln Financial Field, Philadelphia
5 tháng 7 năm 2026
16:00 UTC−4
Thắng trận 76	Trận 91	Thắng trận 78
Chi tiết	
Sân vận động MetLife, Đông Rutherford
5 tháng 7 năm 2026
18:00 UTC−6
Thắng trận 79	Trận 92	Thắng trận 80
Chi tiết	
Sân vận động Azteca, Thành phố México
5 tháng 7 năm 2026
18:00 UTC−5
Thắng trận 83	Trận 93	Thắng trận 84
Chi tiết	
Sân vận động AT&T, Arlington
6 tháng 7 năm 2026
17:00 UTC−7
Thắng trận 81	Trận 94	Thắng trận 82
Chi tiết	
Lumen Field, Seattle
7 tháng 7 năm 2026
12:00 UTC−4
Thắng trận 86	Trận 95	Thắng trận 88
Chi tiết	
Sân vận động Mercedes-Benz, Atlanta
7 tháng 7 năm 2026
13:00 UTC−7
Thắng trận 85	Trận 96	Thắng trận 87
Chi tiết	
BC Place, Vancouver
Tứ kết
9 tháng 7 năm 2026
16:00 UTC−4
Thắng trận 89	Trận 97	Thắng trận 90
Chi tiết	
Sân vận động Gillette, Foxborough
10 tháng 7 năm 2026
12:00 UTC−7
Thắng trận 93	Trận 98	Thắng trận 94
Chi tiết	
Sân vận động SoFi, Inglewood
11 tháng 7 năm 2026
17:00 UTC−4
Thắng trận 91	Trận 99	Thắng trận 92
Chi tiết	
Sân vận động Hard Rock, Miami Gardens
11 tháng 7 năm 2026
20:00 UTC−5
Thắng trận 95	Trận 100	Thắng trận 96
Chi tiết	
Arrowhead Stadium, Kansas City
Bán kết
14 tháng 7 năm 2026
14:00 UTC−5
Thắng trận 97	Trận 101	Thắng trận 98
Chi tiết	
AT&T Stadium, Arlington
15 tháng 7 năm 2026
15:00 UTC−4
Thắng trận 99	Trận 102	Thắng trận 100
Chi tiết	
Sân vận động Mercedes-Benz, Atlanta
Trận tranh hạng ba
18 tháng 7 năm 2026
17:00 UTC−4
Thua trận 101	Trận 103	Thua trận 102
Chi tiết	
Sân vận động Hard Rock, Miami Gardens
Chung kết
19 tháng 7 năm 2026
15:00 UTC−4
Thắng trận 101	Trận 104	Thắng trận 102
Chi tiết	
Sân vận động MetLife, Đông Rutherford
`;

async function getOrCreateTeam(teamName) {
  // Check if team exists
  let { data } = await supabase.from('teams').select('id').eq('name', teamName).single();
  if (data) return data.id;

  // Generate generic flag based on team name
  let flag_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Unknown_flag_-_European_version.png/120px-Unknown_flag_-_European_version.png';
  
  // Try to create pseudo-team
  const { data: insertData, error } = await supabase.from('teams').insert([{
    name: teamName,
    code: 'TBD',
    flag_url: flag_url
  }]).select('id').single();

  if (error) {
    console.error("Error creating team:", teamName, error);
    return null;
  }
  return insertData.id;
}

const monthsMap = {
  'tháng 6': '06',
  'tháng 7': '07'
};

async function parseAndSeed() {
  const lines = rawData.split('\n').map(l => l.trim()).filter(l => l);
  let currentRound = '';
  let currentDate = '';
  let currentTime = '';
  
  let i = 0;
  while(i < lines.length) {
    const line = lines[i];
    if (line === 'Vòng 32 đội' || line === 'Vòng 16 đội' || line === 'Tứ kết' || line === 'Bán kết' || line === 'Trận tranh hạng ba' || line === 'Chung kết') {
      currentRound = line;
      i++;
      continue;
    }
    
    // Check if line is a date (e.g. 28 tháng 6 năm 2026)
    if (line.includes('năm 2026')) {
      currentDate = line;
      // parse date: "28 tháng 6 năm 2026"
      const parts = line.split(' ');
      const day = parts[0].padStart(2, '0');
      const monthStr = parts[1] + ' ' + parts[2]; // tháng 6
      const month = monthsMap[monthStr] || '06';
      currentDate = `2026-${month}-${day}`;
      
      // Next line is time: "12:00 UTC−7"
      i++;
      let timeLine = lines[i];
      console.log('Processing:', line, timeLine); let timeParts = timeLine.split(' '); // ["12:00", "UTC−7"]
      let timeStr = timeParts[0];
      let utcOffset = timeParts[1]; // UTC-7
      let offsetNum = 0;
      if (utcOffset.includes('−')) {
        offsetNum = -parseInt(utcOffset.split('−')[1]);
      } else if (utcOffset.includes('-')) {
        offsetNum = -parseInt(utcOffset.split('-')[1]);
      }
      
      // Convert to UTC
      let [hour, minute] = timeStr.split(':').map(Number);
      hour = hour - offsetNum; // if UTC-7, add 7 to get UTC
      
      // we'll just store the string as an ISO datetime
      // Construct an ISO string for UTC
      let isoDate = new Date(`${currentDate}T${timeStr}:00.000`);
      isoDate.setHours(isoDate.getHours() - offsetNum); // shift by offset
      currentTime = isoDate.toISOString();
      
      // Next line is match: "Nhì bảng A	Trận 73	Nhì bảng B"
      i++;
      let matchLine = lines[i];
      let matchParts = matchLine.split('\t');
      if (matchParts.length >= 3) {
        let homeName = matchParts[0].trim();
        let awayName = matchParts[2].trim();
        
        console.log(`Creating Match: ${currentRound} - ${homeName} vs ${awayName} at ${currentTime}`);
        
        let homeId = await getOrCreateTeam(homeName);
        let awayId = await getOrCreateTeam(awayName);
        
        // Check if match already exists
        const { data: existingMatches } = await supabase.from('matches')
          .select('id')
          .eq('home_team_id', homeId)
          .eq('away_team_id', awayId)
          .eq('round', currentRound);
          
        if (!existingMatches || existingMatches.length === 0) {
           await supabase.from('matches').insert([{
             home_team_id: homeId,
             away_team_id: awayId,
             kickoff_time: currentTime,
             round: currentRound,
             status: 'upcoming'
           }]);
           console.log("-> Inserted");
        } else {
           console.log("-> Skipped (already exists)");
        }
      }
      
      // skip chi tiet and stadium
      while(i + 1 < lines.length && (lines[i+1].includes('Chi tiết') || lines[i+1].includes('Sân vận động') || lines[i+1].includes('Lumen Field') || lines[i+1].includes('Stadium') || lines[i+1].includes('BC Place') || lines[i+1].includes('Field'))) {
         i++;
      }
    }
    i++;
  }
}

parseAndSeed().then(() => console.log('Done')).catch(console.error);
