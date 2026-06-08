const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dumtfmusjlfeoxkewgru.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bXRmbXVzamxmZW94a2V3Z3J1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQ2MTE2NSwiZXhwIjoyMDk2MDM3MTY1fQ.IKlWmRJ14slPOKGR9i4kK4odibeU8c8T-unhNlr0-SY';
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
Bài chi tiết: Trận chung kết Giải vô địch bóng đá thế giới 2026
19 tháng 7 năm 2026
15:00 UTC−4
Thắng trận 101	Trận 104	Thắng trận 102
Chi tiết	
Sân vận động MetLife, Đông Rutherford
`;

const lines = rawData.split('\n').map(l => l.trim()).filter(l => l);

const matches = [];
let currentRound = "Vòng 32 đội";
let currentDay = '';
let currentMonth = '';
let currentTime = '';
let utcOffset = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (["Vòng 32 đội", "Vòng 16 đội", "Tứ kết", "Bán kết", "Trận tranh hạng ba", "Chung kết"].includes(line)) {
    currentRound = line;
    if (currentRound === "Trận tranh hạng ba") currentRound = "Tranh hạng ba";
    continue;
  }
  if (line.startsWith("Bài chi tiết:")) continue;
  
  if (line.includes("tháng") && line.includes("năm 2026")) {
    let parts = line.split(' ');
    currentDay = parts[0];
    currentMonth = parts[2];
    continue;
  }
  
  if (line.includes("UTC")) {
    let parts = line.split(' UTC');
    currentTime = parts[0];
    utcOffset = parseInt(parts[1].replace('−', '-'));
    continue;
  }
  
  if (line.includes("\tTrận ")) {
    let parts = line.split('\t');
    let home = parts[0].trim();
    let away = parts[2].trim();
    
    let isoDate = new Date(`2026-${currentMonth.padStart(2,'0')}-${currentDay.padStart(2,'0')}T${currentTime}:00.000Z`);
    isoDate.setHours(isoDate.getHours() - utcOffset);
    
    matches.push({
      round: currentRound,
      home,
      away,
      time: isoDate.toISOString()
    });
  }
}

async function run() {
  console.log(`Found ${matches.length} matches to insert`);
  const teamsCache = {};
  
  async function getTeam(name) {
    if (teamsCache[name]) return teamsCache[name];
    let { data } = await supabase.from('teams').select('id').eq('name', name).maybeSingle();
    if (data) { 
      teamsCache[name] = data.id; 
      return data.id; 
    }
    
    console.log("Creating pseudo-team:", name);
    let flag_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Unknown_flag_-_European_version.png/120px-Unknown_flag_-_European_version.png';
    let uniqueCode = Math.random().toString(36).substring(2,5).toUpperCase().padStart(3, 'X');
    
    let { data: newTeam, error } = await supabase.from('teams').insert([{ 
      name, 
      code: uniqueCode, 
      flag_url 
    }]).select('id').single();
    
    if (error) {
       console.error("Team insert error:", error);
       throw error;
    }
    teamsCache[name] = newTeam.id;
    return newTeam.id;
  }
  
  for (let m of matches) {
     let hId = await getTeam(m.home);
     let aId = await getTeam(m.away);
     
     let { data: existing } = await supabase.from('matches').select('id').eq('home_team_id', hId).eq('away_team_id', aId).eq('round', m.round);
     if (existing && existing.length > 0) {
       console.log('Skipped existing:', m.home, 'vs', m.away);
       continue;
     }
     
     let { error } = await supabase.from('matches').insert([{ 
       home_team_id: hId, 
       away_team_id: aId, 
       kickoff_time: m.time, 
       round: m.round, 
       status: 'pending' 
     }]);
     
     if (error) {
       console.error("Error inserting:", m, error);
     } else {
       console.log('Inserted', m.home, 'vs', m.away);
     }
  }
  console.log("Done seeding");
}
run();
