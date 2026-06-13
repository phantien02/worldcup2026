const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const xhrUrls = new Set();
  
  page.on('request', request => {
    if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
      xhrUrls.add(request.url());
    }
  });

  await page.goto('https://vnexpress.net/the-thao/world-cup-2026/lich-thi-dau', { waitUntil: 'networkidle2' });
  
  console.log("XHR/Fetch URLs loaded:");
  for (const url of xhrUrls) {
    console.log(url);
  }

  await browser.close();
}
run();
