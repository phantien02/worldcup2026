const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('C:\\Users\\tienpc1\\.gemini\\antigravity\\brain\\181cf735-deea-4d7f-9908-4ddb4ba70988\\.system_generated\\steps\\2671\\content.md', 'utf8');

const dom = new JSDOM(html);
const document = dom.window.document;

const matchNodes = document.querySelectorAll('table.fevent');

const matches = [];
matchNodes.forEach(node => {
  const homeNode = node.querySelector('.fhome');
  const awayNode = node.querySelector('.faway');
  const scoreNode = node.querySelector('.fscore');
  
  if (homeNode && awayNode && scoreNode) {
    let home = homeNode.textContent.trim();
    let away = awayNode.textContent.trim();
    let matchNum = scoreNode.textContent.trim();
    
    // clean up text
    home = home.replace(/\s+/g, ' ');
    away = away.replace(/\s+/g, ' ');
    
    if (matchNum.includes("Trận") || matchNum.match(/\d+/)) {
       matches.push(`${matchNum}: ${home} vs ${away}`);
    }
  }
});

console.log(`Found ${matches.length} matches.`);
matches.forEach(m => console.log(m));
