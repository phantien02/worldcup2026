const googleUrl = 'https://www.google.com/search?q=Qatar+vs+Switzerland';
const bingUrl = 'https://www.bing.com/search?q=Qatar+vs+Switzerland';

async function testSearchEngine(name, url) {
  console.log(`\nTesting ${name}...`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    console.log(`${name} HTML Length:`, html.length);
    
    // Check if score is in HTML
    if (html.includes('1 - 1') || html.includes('1-1') || html.includes('1 : 1') || html.includes('1:1')) {
      console.log(`${name} DOES contain the score 1-1!`);
      const qatarIndex = html.indexOf('Qatar');
      if (qatarIndex !== -1) {
         console.log(`Context: ${html.substring(Math.max(0, qatarIndex - 100), qatarIndex + 200).replace(/\n/g, ' ')}`);
      }
    } else {
      console.log(`${name} DOES NOT contain the score 1-1 in raw HTML.`);
    }
  } catch (e) {
    console.log(`Error fetching ${name}:`, e.message);
  }
}

async function run() {
  await testSearchEngine('Google', googleUrl);
  await testSearchEngine('Bing', bingUrl);
}

run();
