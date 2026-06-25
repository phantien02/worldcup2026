// Found the API base: https://api.znews.vn/public/v3
// Let's try various football endpoints

const base = 'https://api.znews.vn/public/v3';

const endpoints = [
  `${base}/football/schedule?tournamentId=406`,
  `${base}/football/matches?tournamentId=406`,
  `${base}/football/livescore?tournamentId=406`,
  `${base}/football/tournament/406/schedule`,
  `${base}/football/tournament/406/matches`,
  `${base}/football/tournament/406`,
  `${base}/football?tournamentId=406`,
  `${base}/schedule?tournamentId=406`,
];

async function tryEndpoints() {
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
          'Referer': 'https://znews.vn/'
        }
      });
      const text = await res.text();
      const hasData = text.length > 100 && !text.includes('<!DOCTYPE');
      console.log(`${res.status} [${text.length}b] ${hasData ? '✅' : '❌'} ${url}`);
      if (hasData && text.length < 1000) {
        console.log("   Content:", text.substring(0, 300));
      }
      if (hasData && text.toLowerCase().includes('qatar')) {
        console.log("   ==> 🎉 FOUND QATAR DATA!");
        const idx = text.toLowerCase().indexOf('qatar');
        console.log("   ", text.substring(Math.max(0, idx - 100), idx + 200));
      }
    } catch (e) {
      console.log(`ERR ${url}: ${e.message}`);
    }
  }
}

tryEndpoints();
