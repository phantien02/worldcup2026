const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const apiUrls = new Set();
  
  // Listen to all network requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('.json') || url.includes('api') || url.includes('graphql') || url.includes('data')) {
      apiUrls.add(url);
    }
  });

  console.log("Navigating to VNExpress schedule...");
  await page.goto('https://vnexpress.net/the-thao/world-cup-2026/lich-thi-dau', { waitUntil: 'networkidle2' });
  
  console.log("\nPossible APIs loaded:");
  for (const url of apiUrls) {
    console.log(url);
  }

  // Also try to find the /tran-dau/ links on the fully rendered page
  const tranDauLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.map(a => a.href).filter(href => href.includes('/tran-dau/'));
  });

  console.log("\nFully rendered /tran-dau/ links:");
  console.log([...new Set(tranDauLinks)]);

  await browser.close();
}
run();
