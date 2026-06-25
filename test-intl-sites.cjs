const sites = [
  { name: 'BBC Sport', url: 'https://www.bbc.com/sport/football/scores-fixtures' },
  { name: 'SkySports', url: 'https://www.skysports.com/football-fixtures-results' },
  { name: 'ESPN', url: 'https://www.espn.com/soccer/scoreboard' }
];

async function testSites() {
  for (const site of sites) {
    console.log(`\nTesting ${site.name}...`);
    try {
      const res = await fetch(site.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      console.log(`Status: ${res.status}`);
      const html = await res.text();
      console.log(`HTML Length: ${html.length}`);
      
      if (res.status === 403 || html.includes('Just a moment') || html.includes('Cloudflare') || html.includes('Access Denied')) {
        console.log(`=> BLOCKED by anti-bot protection.`);
      } else {
        console.log(`=> SUCCESS! Fetched raw HTML.`);
        // Let's see if Qatar is in the HTML
        if (html.toLowerCase().includes('qatar')) {
          console.log(`=> Found "Qatar" in HTML!`);
        } else {
          console.log(`=> "Qatar" not found in HTML (might be loaded via JS or not on this page).`);
        }
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}

testSites();
