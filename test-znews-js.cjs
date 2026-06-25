const url = 'https://znews.vn/bong-da/lich-thi-dau/406-0/world-cup.html';

async function findJsApis() {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  
  // Extract all script src URLs
  const scriptSrcs = [...html.matchAll(/src="([^"]*\.js[^"]*)"/g)].map(m => m[1]);
  console.log("JS files found:", scriptSrcs.length);
  
  // Find the football-related JS bundle
  for (const src of scriptSrcs) {
    if (src.includes('football') || src.includes('sport') || src.includes('schedule') || src.includes('match')) {
      console.log("Football JS:", src);
    }
  }
  
  // Also look for inline scripts with fetch/axios/ajax calls
  const inlineScripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, code] of inlineScripts) {
    if (code.includes('football') || code.includes('schedule') || code.includes('matchId')) {
      // Look for URL patterns
      const urls = [...code.matchAll(/['"`](\/[^\s'"`]+(?:football|schedule|match|score)[^\s'"`]*)/gi)];
      if (urls.length > 0) {
        console.log("\nFound football URLs in inline script:");
        urls.forEach(u => console.log(" -", u[1]));
      }
      // Also look for full https URLs  
      const httpsUrls = [...code.matchAll(/['"`](https?:\/\/[^\s'"`]*(?:football|schedule|match|score)[^\s'"`]*)/gi)];
      if (httpsUrls.length > 0) {
        console.log("\nFound HTTPS football URLs:");
        httpsUrls.forEach(u => console.log(" -", u[1]));
      }
    }
  }

  // Print all script srcs
  console.log("\nAll JS bundles:");
  scriptSrcs.forEach(s => console.log(" -", s));
}

findJsApis();
