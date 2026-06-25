// Different approach: let's look at the znews page's network requests
// by checking if they use a sports data provider API
// Many Vietnamese news sites use https://sports.znews.vn or similar subdomain

const urls = [
  'https://sports.znews.vn',
  'https://football.znews.vn',  
  'https://data.znews.vn',
  'https://score.znews.vn',
  // Try opta/sportradar style endpoints
  'https://znews.vn/ajax/football/schedule?tournamentId=406',
  'https://znews.vn/bong-da/ajax/schedule?tournamentId=406', 
  'https://znews.vn/bong-da/ajax/lich-thi-dau?tournamentId=406',
  // Common Vietnamese sports data providers
  'https://score.zingmp3.vn',
  // Try the page with different accept headers
];

async function tryAll() {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
        redirect: 'follow'
      });
      console.log(`${res.status} ${url} (${res.headers.get('content-type') || 'unknown'})`);
    } catch (e) {
      console.log(`ERR ${url}: ${e.message}`);
    }
  }
}

// Also: the HTML had football-type="schedule" matchId="0" tournamentId="406"
// Maybe there's a data fetch using those params via XHR
// Let's also check if there is a znews football API with different patterns
async function tryMoreApis() {
  console.log("\n--- More API attempts ---");
  const moreUrls = [
    'https://api.znews.vn/football/schedule?tournamentId=406',
    'https://api.znews.vn/football/matches?tournamentId=406',
    'https://api.znews.vn/v1/football/schedule?tournamentId=406',
    'https://api.znews.vn/v2/football/schedule?tournamentId=406',
    'https://api.znews.vn/public/football/schedule?tournamentId=406',
    'https://w-api.znews.vn/football/schedule?tournamentId=406',
    'https://w-api.znews.vn/public/v3/football/schedule?tournamentId=406',
  ];
  for (const url of moreUrls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Referer': 'https://znews.vn/' }
      });
      const text = await res.text();
      const hasJson = text.startsWith('{') || text.startsWith('[');
      console.log(`${res.status} [${text.length}b] ${hasJson ? '✅ JSON' : '❌'} ${url}`);
      if (hasJson && text.length < 1000) console.log("  ", text.substring(0, 300));
      if (hasJson && text.toLowerCase().includes('qatar')) console.log("  ==> 🎉 FOUND QATAR!");
    } catch (e) {
      console.log(`ERR ${url}: ${e.message}`);
    }
  }
}

async function main() {
  await tryAll();
  await tryMoreApis();
}
main();
