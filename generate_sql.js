const fs = require('fs');
const crypto = require('crypto');

const html = fs.readFileSync('C:/Users/tienpc1/.gemini/antigravity/brain/181cf735-deea-4d7f-9908-4ddb4ba70988/.system_generated/steps/277/content.md', 'utf8');

const regex = /<span class="no-mar fw-medium team-name[^>]*>([^<]+)<\/span>/g;
let m;
const teamsArr = [];

while ((m = regex.exec(html)) !== null) {
  teamsArr.push(m[1].trim());
}

if (teamsArr.length === 0) {
    console.log("No teams found");
    process.exit(1);
}

const uniqueTeams = [...new Set(teamsArr)];

const teamMap = {};
let codeCounter = 100;
uniqueTeams.forEach((t) => {
    // Generate a strictly unique 3-character code
    const code = (codeCounter++).toString();
    teamMap[t] = {
        id: crypto.randomUUID(),
        code: code
    };
});

let sql = `-- SCRIPT TỰ ĐỘNG TẠO ĐỘI & TRẬN THEO DỮ LIỆU TỪ 24H.COM.VN\n\n`;
sql += `INSERT INTO public.teams (id, name, code) VALUES\n`;
const teamValues = uniqueTeams.map(t => {
    return `('${teamMap[t].id}', '${t.replace(/'/g, "''")}', '${teamMap[t].code}')`;
});
sql += teamValues.join(',\n') + `\nON CONFLICT (code) DO NOTHING;\n\n`;

sql += `INSERT INTO public.matches (home_team_id, away_team_id, kickoff_time, status) VALUES\n`;
const matchValues = [];
let baseDate = new Date('2026-06-11T12:00:00Z').getTime();

for(let i=0; i<teamsArr.length; i+=2) {
    if(teamsArr[i] && teamsArr[i+1]) {
        const home = teamMap[teamsArr[i]];
        const away = teamMap[teamsArr[i+1]];
        const kickoff = new Date(baseDate).toISOString();
        matchValues.push(`('${home.id}', '${away.id}', '${kickoff}', 'pending')`);
        baseDate += 4 * 60 * 60 * 1000;
    }
}

sql += matchValues.join(',\n') + `;\n`;

fs.writeFileSync('C:/Users/tienpc1/.gemini/antigravity/scratch/world-cup-2026-predictor/supabase/seed_24h.sql', sql);
console.log("Successfully generated supabase/seed_24h.sql with " + uniqueTeams.length + " teams and " + matchValues.length + " matches.");
