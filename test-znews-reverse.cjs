// The football data is likely loaded by znews.min.js
// Let's download it and search for the API endpoint

async function findFootballApi() {
  const jsUrl = 'https://static.znews.vn/releases/web/v1.9.28/js/znews.min.js';
  console.log("Fetching znews.min.js...");
  const res = await fetch(jsUrl);
  const code = await res.text();
  console.log("JS Length:", code.length);
  
  // Search for football/schedule/match related URL patterns
  const patterns = [
    /['"`]([^'"`]*football[^'"`]*)['"]/gi,
    /['"`]([^'"`]*schedule[^'"`]*)['"]/gi,
    /['"`]([^'"`]*\/match[^'"`]*)['"]/gi,
    /['"`]([^'"`]*livescore[^'"`]*)['"]/gi,
    /['"`](\/api\/[^'"`]*)['"]/gi,
    /['"`](https?:\/\/[^'"`]*api[^'"`]*)['"]/gi,
  ];
  
  const found = new Set();
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(code)) !== null) {
      if (m[1].length < 200) found.add(m[1]);
    }
  }
  
  console.log("\nAll API/football URLs found in znews.min.js:");
  for (const u of [...found].sort()) {
    console.log(" -", u);
  }
}

findFootballApi();
