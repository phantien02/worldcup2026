const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://vnexpress.net/the-thao/world-cup-2026/lich-thi-dau', { waitUntil: 'networkidle', timeout: 30000 });
  const html = await page.content();
  console.log("Contains tran-dau:", html.toLowerCase().includes('tran-dau'));
  console.log("Contains ket-thuc:", html.toLowerCase().includes('kết thúc'));
  console.log("Match links:");
  const matches = [...html.matchAll(/href="([^"]*tran-dau[^"]*)"/ig)];
  matches.forEach(m => console.log(m[1]));
  
  await browser.close();
}
run();
