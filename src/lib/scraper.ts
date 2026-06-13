export interface ScrapeResult {
  home_score: number | null;
  away_score: number | null;
  status: 'pending' | 'live' | 'finished';
  match_time: string | null;
}

// Hàm hỗ trợ loại bỏ thẻ HTML để giảm dung lượng text gửi cho AI
function stripHtmlTags(html: string): string {
  // Lấy nội dung trong thẻ <body> nếu có
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  
  // Xóa các thẻ script, style, svg, iframe
  const cleanHtml = bodyHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' '); // Xóa tất cả các thẻ còn lại

  // Xóa khoảng trắng thừa
  return cleanHtml.replace(/\s+/g, ' ').trim().substring(0, 15000); // Giới hạn 15000 ký tự để API xử lý nhanh
}

async function fetchHtml(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return '';
    return await response.text();
  } catch (error) {
    console.error(`Lỗi fetch ${url}:`, error);
    return '';
  }
}

async function analyzeWithGemini(text: string, homeTeam: string, awayTeam: string): Promise<ScrapeResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Thiếu GEMINI_API_KEY trong biến môi trường');
    return null;
  }

  const prompt = `Bạn là một trợ lý phân tích dữ liệu thể thao.
Dưới đây là văn bản thô trích xuất từ một trang báo thể thao.
Trận đấu ĐANG DIỄN RA HOẶC VỪA KẾT THÚC là giữa đội "${homeTeam}" và đội "${awayTeam}".
Nhiệm vụ của bạn là tìm tỷ số hiện tại và phút thi đấu (hoặc trạng thái: HT, FT, PEN) của trận đấu này từ văn bản bên dưới.

Chú ý:
- Nếu trận đấu chưa diễn ra (không có tỷ số), hãy để null và status là 'pending'.
- Nếu trận đấu đã kết thúc (có chữ Hết giờ, FT, Full time, Penalty), status là 'finished'.
- Trả về duy nhất MỘT đoạn JSON hợp lệ với cấu trúc sau, không kèm giải thích hay markdown code block:
{"home_score": <số bàn đội nhà, null nếu chưa có>, "away_score": <số bàn đội khách, null nếu chưa có>, "status": "<'live' | 'finished' | 'pending'>", "match_time": "<vd: '45', '90', 'HT', 'FT', 'PEN'>"}

Văn bản:
"""
${text}
"""`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
        }
      })
    });

    if (!response.ok) {
      console.error('Lỗi gọi Gemini API:', await response.text());
      return null;
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse JSON
    const jsonStr = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);
    
    // Validate
    if (typeof result.home_score !== 'undefined' && typeof result.away_score !== 'undefined' && result.status) {
      return result as ScrapeResult;
    }
    
    return null;
  } catch (error) {
    console.error('Lỗi phân tích LLM:', error);
    return null;
  }
}

export async function scrapeLiveScore(homeTeam: string, awayTeam: string): Promise<ScrapeResult | null> {
  const sources = [
    'https://vnexpress.net/the-thao',
    'https://thethao247.vn/',
    'https://www.24h.com.vn/bong-da/lich-thi-dau-world-cup-c48a1473268.html'
  ];

  console.log(`[Scraper] Đang cào dữ liệu cho ${homeTeam} vs ${awayTeam}...`);
  
  // Gọi đồng thời 3 nguồn để tối ưu tốc độ (khoảng 1-2 giây)
  const fetchPromises = sources.map(url => fetchHtml(url));
  const htmlResults = await Promise.all(fetchPromises);
  
  const analyzePromises = htmlResults.map((html, idx) => {
    if (!html) return Promise.resolve(null);
    const cleanText = stripHtmlTags(html);
    return analyzeWithGemini(cleanText, homeTeam, awayTeam);
  });
  
  const aiResults = await Promise.all(analyzePromises);
  
  // Lọc ra các kết quả thành công
  const validResults = aiResults.filter(r => r !== null) as ScrapeResult[];
  
  if (validResults.length === 0) {
    console.log('[Scraper] Cả 3 nguồn đều không tìm thấy thông tin');
    return null;
  }

  // Thuật toán kiểm tra chéo (Luật số đông 2/3)
  // Nếu có 2 kết quả giống hệt nhau về tỷ số, ta chọn nó.
  const scoreMap = new Map<string, number>();
  
  for (const res of validResults) {
    if (res.home_score !== null && res.away_score !== null) {
      const key = `${res.home_score}-${res.away_score}-${res.status}`;
      scoreMap.set(key, (scoreMap.get(key) || 0) + 1);
    }
  }

  let finalKey = null;
  let maxCount = 0;
  for (const [key, count] of scoreMap.entries()) {
    if (count > maxCount) {
      maxCount = count;
      finalKey = key;
    }
  }

  // Yêu cầu ít nhất 2 nguồn đồng ý (hoặc nếu chỉ lấy được 1 nguồn thành công thì tin luôn nguồn đó)
  if (finalKey && (maxCount >= 2 || validResults.length === 1)) {
    const winnerResult = validResults.find(r => `${r.home_score}-${r.away_score}-${r.status}` === finalKey);
    console.log(`[Scraper] Đã chốt tỷ số: ${winnerResult?.home_score} - ${winnerResult?.away_score} (${winnerResult?.status})`);
    return winnerResult || null;
  }

  console.log('[Scraper] Dữ liệu nhiễu, các nguồn không thống nhất.');
  return null;
}
