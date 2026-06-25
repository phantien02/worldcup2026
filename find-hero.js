const fs = require('fs');
const lines = fs.readFileSync('src/app/page.tsx', 'utf8').split('\n');
lines.forEach((line, i) => {
  if (line.includes('CHƠI NGAY') || line.includes('DỰ ĐOÁN')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
});
