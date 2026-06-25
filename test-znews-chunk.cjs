// Let's look deeper into the JS bundle for the specific football widget chunk
// The main bundle referenced "article-football-widget" as a chunk name

async function findFootballChunk() {
  const jsUrl = 'https://static.znews.vn/releases/web/v1.9.28/js/znews.min.js';
  const res = await fetch(jsUrl);
  const code = await res.text();
  
  // Find the chunk loading pattern - webpack uses numeric IDs mapped to filenames
  // Search for "football" related chunks
  const footballIdx = code.indexOf('article-football-widget');
  if (footballIdx !== -1) {
    console.log("Football widget chunk context:");
    console.log(code.substring(Math.max(0, footballIdx - 300), footballIdx + 300));
  }
  
  // Also search for any fetch/axios calls with URLs
  const fetchPatterns = [...code.matchAll(/fetch\(["']([^"']+)["']/g), ...code.matchAll(/\.get\(["']([^"']+)["']/g), ...code.matchAll(/\.post\(["']([^"']+)["']/g)];
  console.log("\nfetch/get/post calls found:");
  fetchPatterns.forEach(m => console.log(" -", m[1]));
  
  // Look for "api.znews" usage pattern
  const apiIdx = code.indexOf('api.znews.vn');
  if (apiIdx !== -1) {
    console.log("\nAPI usage context:");
    console.log(code.substring(Math.max(0, apiIdx - 200), apiIdx + 200));
  }
  
  // Search for the football widget JS chunk file
  const chunkPatterns = [...code.matchAll(/["'](\d+)["']\s*:\s*["']([a-f0-9]+)["']/g)];
  console.log("\nWebpack chunks found:", chunkPatterns.length);
  
  // Try to find football-widget chunk URL pattern
  const chunkBase = 'https://static.znews.vn/releases/web/v1.9.28/js/';
  // Search for chunk file patterns
  const chunkFiles = [...code.matchAll(/["']([\w.-]+\.chunk\.js)["']/g)];
  console.log("\nChunk files:");
  chunkFiles.forEach(m => console.log(" -", chunkBase + m[1]));
}

findFootballChunk();
