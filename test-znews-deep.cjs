const url = 'https://znews.vn/bong-da/lich-thi-dau/406-0/world-cup.html';

async function deepCheck() {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  console.log("Status:", res.status);
  console.log("Length:", html.length);
  
  // Search for various keywords
  const keywords = ['Qatar', 'qatar', 'Switzerland', 'Thụy Sĩ', 'thuy si', 'World Cup', 'world-cup', 'lich-thi-dau', 'score', 'match', 'FT', 'fulltime'];
  for (const kw of keywords) {
    const idx = html.indexOf(kw);
    if (idx !== -1) {
      console.log(`\nFound "${kw}" at index ${idx}:`);
      console.log(html.substring(Math.max(0, idx - 80), idx + 80));
    }
  }
  
  // Print first 2000 chars of clean text to see what content is actually there
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log("\n\n=== FIRST 3000 CHARS OF CLEAN TEXT ===");
  console.log(clean.substring(0, 3000));
}

deepCheck();
