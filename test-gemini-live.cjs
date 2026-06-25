require('dotenv').config({ path: '.env.local' });

async function testGemini() {
  try {
    const url = 'https://bong-da.com/the-gioi/world-cup/livescore';
    console.log('Fetching', url);
    const res = await fetch(url);
    const html = await res.text();
    const cleanText = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').slice(0, 15000);
    
    const apiKey = process.env.GEMINI_API_KEY;
    const prompt = `Bạn là chuyên gia phân tích bóng đá. Hãy đọc văn bản sau trích xuất từ trang báo thể thao, và tìm tỷ số hiện tại của trận đấu giữa "Qatar" (Đội nhà) và "Thụy Sĩ" (Đội khách).

Trả về một JSON object duy nhất, định dạng chính xác như sau:
{
  "home_score": <số bàn thắng của đội nhà, hoặc null>,
  "away_score": <số bàn thắng của đội khách, hoặc null>,
  "status": <"pending" nếu chưa đá, "live" nếu đang đá, "finished" nếu đã kết thúc>,
  "match_time": <"Phút XX", "HT", "FT" hoặc "Chưa bắt đầu">
}

Văn bản:
${cleanText}
`;

    console.log('Calling Gemini...');
    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    });
    
    const data = await aiRes.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Gemini returned:', resultText);
  } catch (e) {
    console.error(e);
  }
}

testGemini();
