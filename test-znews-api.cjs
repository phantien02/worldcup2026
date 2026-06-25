const url = 'https://znews.vn/bong-da/lich-thi-dau/406-0/world-cup.html';

async function findApi() {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  
  // Look for API endpoints in the JS code
  const apiPatterns = [/https?:\/\/[^\s"']+api[^\s"']*/gi, /https?:\/\/[^\s"']+football[^\s"']*/gi, /https?:\/\/[^\s"']+schedule[^\s"']*/gi, /https?:\/\/[^\s"']+score[^\s"']*/gi];
  const found = new Set();
  for (const pat of apiPatterns) {
    let m;
    while ((m = pat.exec(html)) !== null) {
      found.add(m[0].replace(/['"\\;,)}\]]+$/, ''));
    }
  }
  console.log("API endpoints found:");
  for (const u of found) {
    console.log(" -", u);
  }

  // Also check the football-page div for data attributes
  const fpIdx = html.indexOf('football-page');
  if (fpIdx !== -1) {
    console.log("\nFootball page div:");
    console.log(html.substring(fpIdx - 50, fpIdx + 200));
  }
}

findApi();
