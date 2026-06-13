import fs from 'fs';

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  const prompt = `Tìm kết quả trận đấu giữa Mexico và Nam Phi tại World Cup 2026. Trả về tỷ số và người ghi bàn.`;
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }]
    })
  });
  
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
