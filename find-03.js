const fs = require('fs');
const lines = fs.readFileSync('src/app/api/recalc-scores/route.ts', 'utf8').split('\n');
lines.forEach((line, i) => {
  if (line.includes('0.3') || line.includes('30%')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
});
