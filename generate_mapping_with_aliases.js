const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('C:\\Users\\tienpc1\\.gemini\\antigravity\\brain\\181cf735-deea-4d7f-9908-4ddb4ba70988\\.system_generated\\steps\\2671\\content.md', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

const footballBoxes = document.querySelectorAll('.footballbox');
const mapping = {};

const aliasMap = {
     "México": "Mexico",
     "Séc": "CH Séc",
     "Bosna và Hercegovina": "Bosnia",
     "Brasil": "Brazil",
     "Hoa Kỳ": "Mỹ",
     "Curaçao": "Curacao",
     "Cabo Verde": "Cape Verde",
     "Sénégal": "Senegal",
     "Algérie": "Algeria",
     "Ả Rập Xê Út": "Saudi Arabia",
     "Maroc": "Marocco",
     "Panamá": "Panama"
};

footballBoxes.forEach(box => {
  const fevent = box.querySelector('.fevent');
  if (!fevent) return;
  
  const homeNode = fevent.querySelector('.fhome');
  const awayNode = fevent.querySelector('.faway');
  const scoreNode = fevent.querySelector('.fscore');
  
  if (!homeNode || !awayNode || !scoreNode) return;
  
  let homeRaw = homeNode.textContent.trim().replace(/\s+/g, ' ');
  let awayRaw = awayNode.textContent.trim().replace(/\s+/g, ' ');
  const matchNum = scoreNode.textContent.trim();
  
  if (matchNum === "Trận 81" && homeRaw === "Nhất bảng G") {
     homeRaw = "Nhất bảng D";
  }

  const home = aliasMap[homeRaw] || homeRaw;
  const away = aliasMap[awayRaw] || awayRaw;
  
  mapping[`${home} vs ${away}`] = matchNum;
  mapping[`${away} vs ${home}`] = matchNum; // Support reverse lookup
});

fs.writeFileSync('src/data/matchMapping.json', JSON.stringify(mapping, null, 2));
console.log(`Generated mapping for ${Object.keys(mapping).length / 2} matches.`);
