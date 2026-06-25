const fs = require('fs');
const lines = fs.readFileSync('src/app/page.tsx', 'utf8').split('\n');
lines.forEach((line, i) => {
  const l = line.toLowerCase();
  if (l.includes('luật') || l.includes('hướng dẫn') || l.includes('điểm thưởng') || l.includes('20%')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
});
