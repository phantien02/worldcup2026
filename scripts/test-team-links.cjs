const fs = require('fs');
const text = fs.readFileSync('vnexpress.html', 'utf16le');

const links = text.match(/href="([^"]+)"/g);
if (links) {
  const filtered = links.filter(l => l.includes('mexico') || l.includes('han-quoc') || l.includes('canada'));
  console.log("Filtered Links:", [...new Set(filtered)]);
} else {
  console.log("No links found");
}
