const fs = require('fs');
const text = fs.readFileSync('vnexpress.html', 'utf16le');
console.log(text.substring(0, 500));
console.log("-------------------");
const links = text.match(/href="([^"]+)"/g);
if (links) {
  console.log("All hrefs:", [...new Set(links)].slice(0, 20));
}
