const fs = require('fs');
const lines = fs.readFileSync('src/app/page.tsx', 'utf8').split('\n');
lines.forEach((line, i) => {
  if (line.includes('30%') || line.includes('Bonus cửa dưới')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
});
