const fs = require('fs');

const data = JSON.parse(fs.readFileSync('fifa_matches.json', 'utf8'));

// We want to extract unique match blocks.
// A match block typically has: "Team A\nTime\nTeam B\nRound\n·\nGroup\n·\nStadium"
const matches = [];
let currentDate = null;

for (const text of data) {
    if (text.match(/^[A-Z][a-z]+ \d{1,2} [A-Z][a-z]+ 2026(\nView groups)?$/)) {
        currentDate = text.replace('\nView groups', '').trim();
    }
    
    // Look for a block with exactly 9 lines (or contains First Stage/Group)
    if (text.includes('·\nGroup') || text.includes('·\nRound')) {
        const lines = text.split('\n');
        // Example: Mexico, 02:00, South Africa, First Stage, ·, Group A, ·, Mexico City Stadium, (Mexico City)
        if (lines.length >= 6) {
            // Find the time line (HH:mm)
            const timeIdx = lines.findIndex(l => l.match(/^\d{2}:\d{2}$/));
            if (timeIdx > 0 && timeIdx < lines.length - 1) {
                const home = lines[timeIdx - 1];
                const away = lines[timeIdx + 1];
                const time = lines[timeIdx];
                
                // Find group/round
                let round = "";
                for (let i = timeIdx + 2; i < lines.length; i++) {
                    if (lines[i].startsWith('Group') || lines[i].startsWith('Round')) {
                        round = lines[i];
                        break;
                    }
                }
                
                // Only add if not already added (Playwright dumped overlapping elements)
                const isDuplicate = matches.find(m => m.home === home && m.away === away && m.date === currentDate);
                if (!isDuplicate) {
                    matches.push({
                        date: currentDate,
                        time: time,
                        home: home,
                        away: away,
                        round: round
                    });
                }
            }
        }
    }
}

console.log("Extracted matches:", matches.length);
console.log(matches.slice(0, 10));

fs.writeFileSync('parsed_fifa.json', JSON.stringify(matches, null, 2));
