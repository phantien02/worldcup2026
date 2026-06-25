require('dotenv').config({ path: '.env.local' });

async function checkBing() {
  const url = 'https://www.bing.com/search?q=Qatar+vs+Switzerland';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  const html = await res.text();
  
  const apiKey = process.env.GEMINI_API_KEY;
  const cleanText = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').slice(0, 25000); 
  
  const prompt = `Bạn là chuyên gia phân tích bóng đá. Hãy tìm kiếm trong văn bản trích xuất từ trang báo xem có tỷ số của trận đấu giữa "Qatar" và "Switzerland" không. Trả về JSON: {"home_score": <số|null>, "away_score": <số|null>, "status": "pending"|"live"|"finished"}. Văn bản: ${cleanText}`;

  const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 }
    })
  });
  
  const data = await aiRes.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log("Bing Result:", text);
}

checkBing();
