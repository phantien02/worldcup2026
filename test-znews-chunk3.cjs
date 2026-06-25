// Let's try a completely different approach:
// Use browser DevTools Network tab simulation
// Try loading the known chunk names directly

const base = 'https://static.znews.vn/releases/web/v1.9.28/js/';

const chunkNames = [
  'article-football-widget~article-worldcup2026-widget~oa-trending',
  'article-football-widget~category', 
  'article-worldcup2026-widget~oa-trending',
];

// Try common webpack filename patterns
const patterns = [
  (name, i) => `${i}.js`,
  (name, i) => `${name}.js`,
  (name, i) => `${i}.chunk.js`,
  (name, i) => `${name}.chunk.js`,
];

async function tryChunks() {
  // First try the numbered chunks directly
  for (let i = 0; i <= 20; i++) {
    const url = `${base}${i}.js`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.status === 200) {
        console.log(`✅ Found: ${url}`);
        // Download and check for football API
        const fullRes = await fetch(url);
        const code = await fullRes.text();
        if (code.includes('football') || code.includes('schedule') || code.includes('matchId')) {
          console.log(`   ==> 🎉 Contains football code! (${code.length} bytes)`);
          // Look for API URLs
          const apis = [...code.matchAll(/["'](https?:\/\/[^"']*(?:football|schedule|match|score|api)[^"']*)/gi)];
          apis.forEach(m => console.log("   API:", m[1]));
          // Look for fetch patterns
          const fetches = [...code.matchAll(/(?:fetch|get|post|axios)\s*\(\s*["'`]([^"'`]+)/gi)];
          fetches.forEach(m => console.log("   Fetch:", m[1]));
        }
      }
    } catch (e) {}
  }
}

tryChunks();
