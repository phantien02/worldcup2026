const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const c = fs.readFileSync(file, 'utf8').toLowerCase();
        if (c.includes('luật') || c.includes('hướng dẫn') || c.includes('điểm thưởng') || c.includes('20%')) {
          results.push(file);
        }
      }
    }
  });
  return results;
}
console.log(walk('src'));
