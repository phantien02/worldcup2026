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
        const c = fs.readFileSync(file, 'utf8');
        if (c.includes('DỰ ĐOÁN') || c.includes('CHƠI NGAY')) {
          results.push(file);
        }
      }
    }
  });
  return results;
}
console.log(walk('src'));
