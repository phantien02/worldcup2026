const fs = require('fs');

const html = fs.readFileSync('C:/Users/tienpc1/.gemini/antigravity/brain/181cf735-deea-4d7f-9908-4ddb4ba70988/.system_generated/steps/277/content.md', 'utf8');

// The HTML contains teams in: <span class="no-mar fw-medium team-name text-right">Team1</span>
// Or something similar. Let's match all of them:
const regex = /<span class="no-mar fw-medium team-name[^>]*>([^<]+)<\/span>/g;
let m;
const teams = [];

while ((m = regex.exec(html)) !== null) {
  teams.push(m[1].trim());
}

if (teams.length > 0) {
    const matches = [];
    for(let i=0; i<teams.length; i+=2) {
        if(teams[i] && teams[i+1]) {
            matches.push(`${teams[i]} VS ${teams[i+1]}`);
        }
    }
    console.log("Found " + matches.length + " matches!");
    console.log(matches.slice(0, 15));
} else {
    console.log("No teams found");
}
