const fs = require('fs');
const text = fs.readFileSync('vnexpress.html', 'utf16le');
const jsFiles = text.match(/https:\/\/s1\.vnecdn\.net\/[^"]+\.js/g);
console.log(jsFiles ? [...new Set(jsFiles)] : "No JS files");
