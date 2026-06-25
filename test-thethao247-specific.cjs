require('dotenv').config({ path: '.env.local' });

async function analyzeWithGemini(html, homeTeam, awayTeam) {
  const apiKey = process.env.GEMINI_API_KEY;
  const cleanText = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').slice(0, 25000); 
  
  const prompt = `Bạn là chuyên gia phân tích bóng đá. Hãy tìm kiếm trong văn bản trích xuất từ trang báo xem có tỷ số của trận đấu giữa "${homeTeam}" và "${awayTeam}" không. Trả về JSON: {"home_score": <số|null>, "away_score": <số|null>, "status": "pending"|"live"|"finished"}. Văn bản: ${cleanText}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 }
    })
  });
  
  if (!res.ok) return null;
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  try {
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (e) {
    return null;
  }
}

async function testSpecific() {
  const url = 'https://thethao247.vn/world-cup/';
  console.log('Fetching', url, '...');
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
    const html = await res.text();
    console.log(`- Fetched ${html.length} bytes`);
    
    // Also let's just grep the html for "Thụy" to see if it's there
    const index = html.toLowerCase().indexOf('thụy');
    if (index !== -1) {
       console.log('Context around Thuy Si in HTML:');
       console.log(html.substring(Math.max(0, index - 100), index + 100));
    } else {
       console.log('Thuy Si not found in HTML text directly.');
    }

    const result = await analyzeWithGemini(html, 'Qatar', 'Thụy Sĩ');
    console.log(`- Gemini Result for ${url}:`, result);
  } catch (e) {
    console.error(e.message);
  }
}

testSpecific();
