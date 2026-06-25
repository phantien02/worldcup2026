// Found chunk mapping! Let's try to load the football widget chunk
// Chunk 2: "article-football-widget~article-worldcup2026-widget~oa-trending"
// Chunk 4: "article-football-widget~category"
// We need to figure out the chunk filename pattern

async function findAndLoadChunks() {
  const jsUrl = 'https://static.znews.vn/releases/web/v1.9.28/js/znews.min.js';
  const res = await fetch(jsUrl);
  const code = await res.text();
  
  // Find the chunk filename mapping - look for hash mapping like {0:"hash", 2:"hash"...}
  // Usually webpack has: chunkId + "." + hash + ".chunk.js"
  const hashMaps = [...code.matchAll(/\{(?:\d+:"[a-f0-9]+"(?:,)?)+\}/g)];
  console.log("Potential hash maps found:", hashMaps.length);
  hashMaps.forEach((m, i) => {
    if (m[0].length < 500) console.log(`Map ${i}:`, m[0]);
  });
  
  // Look for the pattern r.p + "something" to find chunk URL template
  const chunkUrlPatterns = [...code.matchAll(/r\.p\s*\+\s*["']([^"']*)["']/g)];
  console.log("\nChunk URL base patterns:");
  chunkUrlPatterns.forEach(m => console.log(" -", m[1]));

  // Search for ".chunk.js" or ".js" patterns near chunk loading
  const jsPatterns = [...code.matchAll(/["'](\.chunk\.js|\.js)["']/g)];
  console.log("\nJS extension patterns:", jsPatterns.length);
}

findAndLoadChunks();
