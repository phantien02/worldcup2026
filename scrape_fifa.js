const { chromium } = require('playwright');
const fs = require('fs');

async function run() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log("Navigating to FIFA...");
  await page.goto('https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures?country=VN&wtw-filter=ALL', { waitUntil: 'domcontentloaded' });
  
  console.log("Extracting match data...");
  await page.waitForTimeout(5000);
  console.log("Waited 5s");
  
  const matches = await page.evaluate(() => {
    // Try to get anything that looks like a match
    const matchElements = document.querySelectorAll('[class*="fixture"], [class*="match"]');
    return Array.from(matchElements).map(c => c.innerText).filter(t => t.trim().length > 0);
  });
  
  if (matches.length === 0) {
     const html = await page.content();
     fs.writeFileSync('fifa_dump.html', html);
     console.log("No matches found. HTML dumped to fifa_dump.html");
  } else {
     console.log("Found some text blocks with match/fixture classes:", matches.length);
     fs.writeFileSync('fifa_matches.json', JSON.stringify(matches, null, 2));
  }
  
  await browser.close();
}

run().catch(console.error);
