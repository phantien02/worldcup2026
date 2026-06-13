
async function testFetch(url, name) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await response.text();
    console.log(`[${name}] OK, Length: ${html.length}. Status: ${response.status}`);
    
    // Look for JSON data or specific terms
    if (html.includes('World Cup')) {
      console.log(`[${name}] Contains "World Cup"`);
    }
    
    // Attempt to extract typical api endpoints if present in html
    const apiMatches = html.match(/https:\/\/[^\s"'<>]+\/api\/[^\s"'<>]+/g);
    if (apiMatches) {
        console.log(`[${name}] Found APIs:`, [...new Set(apiMatches)].slice(0, 3));
    }

  } catch (error) {
    console.error(`[${name}] Failed:`, error.message);
  }
}

async function run() {
  await testFetch('https://vnexpress.net/the-thao', 'VnExpress');
  await testFetch('https://thethao247.vn/world-cup-c55/', 'TheThao247');
  await testFetch('https://www.24h.com.vn/bong-da/lich-thi-dau-world-cup-c48a1473268.html', '24h');
  await testFetch('https://www.sofascore.com/', 'SofaScore');
}

run();
