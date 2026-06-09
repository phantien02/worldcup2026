const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('C:\\Users\\tienpc1\\.gemini\\antigravity\\brain\\181cf735-deea-4d7f-9908-4ddb4ba70988\\.system_generated\\steps\\2671\\content.md', 'utf8');

const dom = new JSDOM(html);
const document = dom.window.document;
const matchNodes = document.querySelectorAll('table.fevent');

const mapping = {};

matchNodes.forEach(node => {
  const homeNode = node.querySelector('.fhome');
  const awayNode = node.querySelector('.faway');
  const scoreNode = node.querySelector('.fscore');
  
  if (homeNode && awayNode && scoreNode) {
    let home = homeNode.textContent.trim().replace(/\s+/g, ' ');
    let away = awayNode.textContent.trim().replace(/\s+/g, ' ');
    let matchNum = scoreNode.textContent.trim();
    
    // Fix Wikipedia error for Match 81
    if (matchNum === "Trận 81" && home === "Nhất bảng G") {
       home = "Nhất bảng D";
    }

    if (matchNum.includes("Trận") || matchNum.match(/\d+/)) {
       mapping[`${home} vs ${away}`] = matchNum;
       mapping[`${away} vs ${home}`] = matchNum; // reverse just in case
    }
  }
});

fs.writeFileSync('src/data/matchMapping.json', JSON.stringify(mapping, null, 2));
console.log(`Saved ${Object.keys(mapping).length / 2} matches to matchMapping.json`);
