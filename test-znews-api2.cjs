// Look for znews football API - they likely use an internal API 
// to load match data for the schedule page
const possibleApis = [
  'https://znews.vn/api/v1/football/schedule?tournamentId=406',
  'https://w-api.znews.vn/api/v1/football/schedule?tournamentId=406',
  'https://znews.vn/bong-da/api/schedule?tournamentId=406',
  'https://znews.vn/api/football/schedule?tournamentId=406',
];

async function tryApis() {
  for (const url of possibleApis) {
    console.log(`\nTrying: ${url}`);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
          'Referer': 'https://znews.vn/bong-da/lich-thi-dau/406-0/world-cup.html'
        }
      });
      console.log("Status:", res.status);
      const text = await res.text();
      console.log("Length:", text.length);
      if (text.length < 2000) {
        console.log("Content:", text.substring(0, 500));
      } else {
        // Check for Qatar
        if (text.toLowerCase().includes('qatar')) {
          console.log("==> Found Qatar! Checking score...");
          const idx = text.toLowerCase().indexOf('qatar');
          console.log(text.substring(Math.max(0, idx - 200), idx + 200));
        }
      }
    } catch (e) {
      console.log("Error:", e.message);
    }
  }
}

tryApis();
