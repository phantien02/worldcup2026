const fs = require('fs');
const text = fs.readFileSync('vnexpress.html', 'utf16le');
console.log("Found 1489387:", text.includes('1489387'));
console.log("Found canada-qatar:", text.includes('canada-qatar'));
