export interface ScrapeResult {
  home_score: number | null;
  away_score: number | null;
  status: 'pending' | 'live' | 'finished';
  match_time: string | null;
  events: {
    home_events: Array<{ player: string, time: string, is_penalty: boolean, assist: string | null }>;
    away_events: Array<{ player: string, time: string, is_penalty: boolean, assist: string | null }>;
    shootout?: {
      home_score: number;
      away_score: number;
      home_kicks: Array<{ player: string, success: boolean }>;
      away_kicks: Array<{ player: string, success: boolean }>;
    } | null;
  } | null;
}

// Hàm hỗ trợ loại bỏ thẻ HTML để giảm dung lượng text gửi cho AI
function stripHtmlTags(html: string): string {
  // Lấy nội dung trong thẻ <body> nếu có
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  
  // Xóa các thẻ script, style, svg (ngoại trừ các svg/img là icon bàn thắng/thẻ phạt), iframe
  // Gắn nhãn BÀN THẮNG và THẺ ĐỎ cho các icon để AI hiểu được
  const htmlWithIcons = bodyHtml
    .replace(/<svg[^>]*class="[^"]*(ic-ball|goal|bong-da|icon-ball)[^"]*"[^>]*>[\s\S]*?<\/svg>/gi, ' [BÀN THẮNG] ')
    .replace(/<img[^>]*src="[^"]*(ball|goal|bong-da)[^"]*"[^>]*>/gi, ' [BÀN THẮNG] ')
    .replace(/<svg[^>]*class="[^"]*(ic-red|red-card|the-do)[^"]*"[^>]*>[\s\S]*?<\/svg>/gi, ' [THẺ ĐỎ] ')
    .replace(/<img[^>]*src="[^"]*(red-card|the-do)[^"]*"[^>]*>/gi, ' [THẺ ĐỎ] ')
    .replace(/\(pen\)/gi, ' (penalty) ')
    .replace(/\(og\)/gi, ' (phản lưới nhà) ');

  const cleanHtml = htmlWithIcons
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

export async function analyzeWithGemini(text: string, homeTeam: string, awayTeam: string): Promise<ScrapeResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Thiếu GEMINI_API_KEY trong biến môi trường');
    return null;
  }

  const prompt = `Bạn là một chuyên gia phân tích bóng đá. Hãy đọc đoạn văn bản sau trích xuất từ trang báo thể thao trực tiếp, và tìm tỷ số hiện tại của trận đấu giữa "${homeTeam}" (Đội nhà) và "${awayTeam}" (Đội khách).
Bạn cũng cần phải tìm danh sách các cầu thủ ghi bàn, kiến tạo và kết quả loạt sút luân lưu (nếu có).

Trả về một JSON object duy nhất, định dạng chính xác như sau:
{
  "home_score": <số bàn thắng của đội nhà, hoặc null>,
  "away_score": <số bàn thắng của đội khách, hoặc null>,
  "status": "finished" (nếu trận đấu đã kết thúc/hết giờ), "live" (nếu đang diễn ra), hoặc "pending" (nếu chưa bắt đầu),
  "match_time": "Thời gian hiện tại, ví dụ: 'Phút 89', 'HT', 'FT', 'Hết giờ'",
  "events": {
    "home_events": [
      { "player": "Tên cầu thủ", "time": "Phút ghi bàn (ví dụ 23')", "is_penalty": true/false (nếu là bàn từ đá phạt đền penalty/ph.đ), "assist": "Tên người kiến tạo hoặc null" }
    ],
    "away_events": [ ...tương tự... ],
    "shootout": null (nếu không có luân lưu) HOẶC nếu có loạt sút luân lưu thì trả về object: {
      "home_score": <tổng số quả luân lưu thành công của đội nhà>,
      "away_score": <tổng số quả luân lưu thành công của đội khách>,
      "home_kicks": [{ "player": "Tên cầu thủ", "success": true/false (sút vào hay trượt) }],
      "away_kicks": [{ "player": "Tên cầu thủ", "success": true/false }]
    }
  }
}

Lưu ý quan trọng:
- CHỈ trả về JSON object, không kèm markdown, không giải thích.
- Nếu không tìm thấy tỷ số, hãy trả về { "home_score": null, "away_score": null, "status": "pending", "match_time": "", "events": null }.
- Sự kiện (events) chỉ chứa CẦU THỦ GHI BÀN. Tuyệt đối KHÔNG đưa cầu thủ bị thẻ đỏ, thẻ vàng hay thay người vào danh sách này.
- MẸO QUAN TRỌNG: Các cầu thủ ghi bàn thường có chữ [BÀN THẮNG] bên cạnh tên họ (do hệ thống đã đánh dấu icon quả bóng). Các cầu thủ bị thẻ sẽ có chữ [THẺ ĐỎ]. Hãy dựa vào dấu hiệu này để phân biệt cầu thủ ghi bàn và cầu thủ nhận thẻ!

Văn bản:
"""
${text}
"""`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
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
    'https://vnexpress.net/the-thao/world-cup-2026/lich-thi-dau',
    'https://vnexpress.net/the-thao',
    'https://thethao247.vn/',
    'https://www.24h.com.vn/bong-da-c48.html'
  ];

  console.log(`[Scraper] Đang cào dữ liệu cho ${homeTeam} vs ${awayTeam}...`);
  
  // Thuật toán Tuần tự (Sequential Fallback) để tiết kiệm API Quota
  // Lần lượt đọc từng tờ báo. Nếu báo 1 có kết quả -> Chốt luôn và thoát. Không gọi AI cho báo 2, 3.
  for (const url of sources) {
    try {
      const html = await fetchHtml(url);
      if (!html) continue;
      
      const cleanText = stripHtmlTags(html);
      const result = await analyzeWithGemini(cleanText, homeTeam, awayTeam);
      
      if (result && result.home_score !== null && result.away_score !== null) {
        console.log(`[Scraper] Đã chốt tỷ số từ nguồn ${url}: ${result.home_score} - ${result.away_score} (${result.status})`);
        return result; // Tìm thấy là trả về ngay lập tức, tiết kiệm 2 request còn lại
      }
    } catch (err) {
      console.error(`[Scraper] Lỗi khi xử lý nguồn ${url}:`, err);
    }
  }

  console.log('[Scraper] Cả 3 nguồn đều không tìm thấy thông tin hoặc bị lỗi API.');
  return null;
}
