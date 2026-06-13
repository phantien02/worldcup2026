const fs = require('fs');
const text = fs.readFileSync('vnexpress.html', 'utf8');

const matches = text.match(/\/tran-dau\//gi);
console.log("Count of /tran-dau/ in HTML:", matches ? matches.length : 0);

const apis = text.match(/https?:\/\/[^\s"'<>]+\.(json|api)[^\s"'<>]*/gi);
if (apis) {
  console.log("APIs:", [...new Set(apis)]);
}

// Check if there is any data embedded in a script block
const scriptData = text.match(/window\.__NUXT__|window\.__INITIAL_STATE__|var matchData/gi);
console.log("Embedded JS data markers:", scriptData);
