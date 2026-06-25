const url = 'https://bong-da.com/the-gioi/world-cup/livescore';

async function checkApi() {
  const res = await fetch(url);
  const html = await res.text();
  
  // Let's look for script tags that might contain the API URL
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gm;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    if (match[1].includes('api') || match[1].includes('ajax') || match[1].includes('fetch') || match[1].includes('match-id-61477')) {
      console.log("Found script:", match[1].substring(0, 500));
    }
  }
}

checkApi();
