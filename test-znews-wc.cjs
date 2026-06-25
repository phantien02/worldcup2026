require('dotenv').config({ path: '.env.local' });

async function testZnewsWC() {
  const url = 'https://znews.vn/worldcup-2026';
  console.log('Fetching', url, '...');
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  console.log('Status:', res.status);
  const html = await res.text();
  console.log('HTML Length:', html.length);

  // Check for Qatar
  const qIdx = html.toLowerCase().indexOf('qatar');
  if (qIdx !== -1) {
    console.log('\n✅ Found "Qatar" in HTML!');
    console.log('Context:', html.substring(Math.max(0, qIdx - 100), qIdx + 150));
  } else {
    console.log('\n❌ "Qatar" NOT found.');
  }

  // Check for Thụy Sĩ
  const tIdx = html.indexOf('Th');
  const thuySiIdx = html.indexOf('Thụy S');
  if (thuySiIdx !== -1) {
    console.log('\n✅ Found "Thụy Sĩ" in HTML!');
    console.log('Context:', html.substring(Math.max(0, thuySiIdx - 100), thuySiIdx + 150));
  }

  // Check for score patterns
  if (html.includes('1-1') || html.includes('1 - 1')) {
    console.log('\n✅ Found "1-1" score!');
  }

  // Clean text and send to Gemini
  const cleanText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log('\nClean text length:', cleanText.length);
  
  // Print first 5000 chars to see what articles are there
  console.log('\n=== FIRST 5000 CHARS ===');
  console.log(cleanText.substring(0, 5000));

  // Now ask Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  const prompt = `Bạn là chuyên gia phân tích bóng đá. Hãy tìm kiếm trong văn bản trích xuất từ trang báo xem có thông tin về kết quả trận đấu giữa "Qatar" và "Thụy Sĩ" (hoặc Switzerland) tại World Cup 2026 không. Trả về JSON: {"home_score": <số|null>, "away_score": <số|null>, "status": "pending"|"live"|"finished", "source": "tiêu đề bài báo nếu tìm thấy"}. Văn bản: ${cleanText.slice(0, 25000)}`;

  const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 }
    })
  });
  
  const data = await aiRes.json();
  console.log('Raw Data:', JSON.stringify(data, null, 2));
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('\n🤖 Gemini Result:', text);
}

testZnewsWC();
