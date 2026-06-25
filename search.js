const fs = require('fs');
const content = fs.readFileSync('src/app/match/[id]/page.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('người đoán') || lines[i].includes('Thống kê')) {
    console.log(`Line ${i + 1}: ${lines[i].trim()}`);
  }
}
