const fs = require('fs');
const text = fs.readFileSync('vnexpress.html', 'utf8');

const jsFiles = text.match(/src="([^"]+\.js[^"]*)"/gi);
console.log("JS Files:", jsFiles ? [...new Set(jsFiles)] : "None");
