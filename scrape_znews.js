const { chromium } = require('@playwright/test');
const fs = require('fs');

async function scrape() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log("Navigating to Znews...");
  await page.goto('https://znews.vn/worldcup-2026/lich-thi-dau.html', { waitUntil: 'networkidle' });
  
  console.log("Waiting for matches to render...");
  // Wait a few seconds for JS to fully populate
  await page.waitForTimeout(5000);
  
  // Extract all text to see what teams are there
  const bodyText = await page.evaluate(() => document.body.innerText);
  
  const matches = await page.evaluate((bodyText) => {
    // This depends on the DOM structure of Znews. We will just dump all text first
    // Or we can try to find elements that look like matches.
    const matchElems = Array.from(document.querySelectorAll('div, li, a, tr')).filter(el => {
        const text = el.innerText;
        return text && text.includes(':') && (text.includes('Hôm nay') || text.includes('2026') || text.includes('/') || text.includes('vs'));
    });
    
    return {
        preview: bodyText.substring(0, 1000),
        mexicoCount: (bodyText.match(/Mexico/g) || []).length,
        qatarCount: (bodyText.match(/Qatar/g) || []).length,
        vietnamCount: (bodyText.match(/Việt Nam/g) || []).length
    };
  }, bodyText);
  
  fs.writeFileSync('znews_dump.json', JSON.stringify(matches, null, 2));
  console.log("Saved to znews_dump.json");
  
  await browser.close();
}

scrape().catch(console.error);
