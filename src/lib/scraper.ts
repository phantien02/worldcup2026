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
  // Xóa script, style, svg, noscript
  const cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' '); // Xóa tất cả các thẻ còn lại

  // Xóa khoảng trắng thừa và giới hạn độ dài để tránh quá tải API
  return cleanHtml.replace(/\s+/g, ' ').trim().substring(0, 10000);
}

async function fetchHtml(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
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

// Bản đồ tên đội Tiếng Việt -> Tiếng Anh (dùng cho Google News quốc tế)
const teamNameMap: Record<string, string> = {
  'Thụy Sĩ': 'Switzerland', 'Thụy Sỹ': 'Switzerland',
  'Đức': 'Germany', 'Pháp': 'France', 'Tây Ban Nha': 'Spain',
  'Ý': 'Italy', 'Anh': 'England', 'Hà Lan': 'Netherlands',
  'Bỉ': 'Belgium', 'Bồ Đào Nha': 'Portugal', 'Croatia': 'Croatia',
  'Ba Lan': 'Poland', 'Thổ Nhĩ Kỳ': 'Turkey', 'Đan Mạch': 'Denmark',
  'Thụy Điển': 'Sweden', 'Na Uy': 'Norway', 'Phần Lan': 'Finland',
  'Áo': 'Austria', 'Hy Lạp': 'Greece', 'Serbia': 'Serbia',
  'Nhật Bản': 'Japan', 'Hàn Quốc': 'South Korea',
  'Úc': 'Australia', 'Ả Rập Xê Út': 'Saudi Arabia',
  'Iran': 'Iran', 'Iraq': 'Iraq',
  'Trung Quốc': 'China', 'Thái Lan': 'Thailand',
  'Indonesia': 'Indonesia', 'Malaysia': 'Malaysia',
  'Việt Nam': 'Vietnam', 'Myanmar': 'Myanmar',
  'Mexico': 'Mexico', 'Colombia': 'Colombia',
  'Argentina': 'Argentina', 'Chile': 'Chile',
  'Peru': 'Peru', 'Ecuador': 'Ecuador', 'Uruguay': 'Uruguay',
  'Paraguay': 'Paraguay', 'Bolivia': 'Bolivia', 'Venezuela': 'Venezuela',
  'Brazil': 'Brazil', 'Costa Rica': 'Costa Rica',
  'Panama': 'Panama', 'Honduras': 'Honduras',
  'Canada': 'Canada', 'Mỹ': 'USA',
  'Nigeria': 'Nigeria', 'Cameroon': 'Cameroon',
  'Ai Cập': 'Egypt', 'Ghana': 'Ghana', 'Senegal': 'Senegal',
  'Morocco': 'Morocco', 'Tunisia': 'Tunisia', 'Algeria': 'Algeria',
  'Nam Phi': 'South Africa', 'Bờ Biển Ngà': 'Ivory Coast',
  'CHDC Congo': 'DR Congo', 'Congo DR': 'DR Congo',
  'Mali': 'Mali', 'Burkina Faso': 'Burkina Faso',
  'New Zealand': 'New Zealand', 'Scotland': 'Scotland',
  'Haiti': 'Haiti', 'Jamaica': 'Jamaica', 'Trinidad': 'Trinidad',
  'Curacao': 'Curacao', 'Jordan': 'Jordan',
  'Bahrain': 'Bahrain', 'Oman': 'Oman',
  'Bangladesh': 'Bangladesh', 'Cape Verde': 'Cape Verde',
};

function getEnglishName(name: string): string {
  return teamNameMap[name] || name;
}

export async function analyzeWithGemini(text: string, homeTeam: string, awayTeam: string): Promise<ScrapeResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Thiếu GEMINI_API_KEY trong biến môi trường');
    return null;
  }

  const homeEn = getEnglishName(homeTeam);
  const awayEn = getEnglishName(awayTeam);

  const prompt = `Bạn là chuyên gia phân tích bóng đá. Hãy đọc văn bản sau và tìm tỷ số chung cuộc của trận đấu giữa "${homeTeam}" (hay "${homeEn}") (Đội nhà) và "${awayTeam}" (hay "${awayEn}") (Đội khách).

Trả về một JSON object duy nhất, định dạng chính xác như sau:
{
  "home_score": <số bàn thắng của đội nhà, hoặc null>,
  "away_score": <số bàn thắng của đội khách, hoặc null>,
  "status": "finished" (nếu trận đấu đã kết thúc), "live" (nếu đang diễn ra), hoặc "pending" (nếu chưa bắt đầu/không tìm thấy),
  "match_time": "FT" hoặc null
}

Lưu ý quan trọng:
- CHỈ trả về JSON object, không kèm markdown, không giải thích.
- Ưu tiên tìm kết quả CHUNG CUỘC (Full Time / FT). Nếu thấy cả tỷ số hiệp 1 và tỷ số chung cuộc, chỉ lấy tỷ số chung cuộc.
- Nếu không tìm thấy tỷ số, hãy trả về { "home_score": null, "away_score": null, "status": "pending", "match_time": null }.

Văn bản:
"""
${text}
"""`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent?key=${apiKey}`, {
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
    const parts = data.candidates?.[0]?.content?.parts || [];
    const resultText = parts.map((p: any) => p.text).join('\n');
    
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

function normalize(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/đ/g, 'd');
}

export async function scrapeLiveScore(homeTeam: string, awayTeam: string): Promise<ScrapeResult | null> {
  const homeEn = getEnglishName(homeTeam);
  const awayEn = getEnglishName(awayTeam);

  console.log(`[Scraper] Đang tìm kết quả cho ${homeTeam} vs ${awayTeam} (${homeEn} vs ${awayEn})...`);

  // ===== BƯỚC 1: Znews World Cup 2026 (Ưu tiên đọc báo Znews trước) =====
  const newsSources = [
    'https://znews.vn/worldcup-2026',
    'https://vnexpress.net/the-thao/world-cup-2026',
    'https://www.24h.com.vn/bong-da-c48.html',
  ];

  for (const url of newsSources) {
    try {
      console.log(`[Scraper] Đang quét ${url}...`);
      const html = await fetchHtml(url);
      if (!html || html.length < 500) continue;
      
      const cleanText = stripHtmlTags(html);

      // PRE-FILTER: Kiểm tra xem text bài báo có chứa tên đội không TRƯỚC KHI gọi Gemini
      const textLower = cleanText.toLowerCase();
      const hasTeamName = textLower.includes(homeTeam.toLowerCase()) || 
                          textLower.includes(awayTeam.toLowerCase()) ||
                          textLower.includes(homeEn.toLowerCase()) || 
                          textLower.includes(awayEn.toLowerCase());

      if (!hasTeamName) {
        console.log(`[Scraper] ⏭️ Bỏ qua trang ${url} (không chứa tên đội), tiết kiệm 1 lượt Gemini.`);
        continue;
      }

      const result = await analyzeWithGemini(cleanText, homeTeam, awayTeam);
      
      if (result && result.home_score !== null && result.away_score !== null) {
        console.log(`[Scraper] ✅ Chốt tỷ số từ ${url}: ${result.home_score} - ${result.away_score} (${result.status})`);
        return result;
      }
    } catch (err) {
      console.error(`[Scraper] Lỗi khi xử lý ${url}:`, err);
    }
  }

  // ===== BƯỚC 2: Google News RSS (Tìm kiếm nếu Znews không có) =====
  const googleNewsUrls = [
    // Tìm theo đúng cú pháp "brazil vs morocco kết quả"
    `https://news.google.com/rss/search?q=${encodeURIComponent(homeTeam + ' vs ' + awayTeam + ' kết quả')}&hl=vi&gl=VN&ceid=VN:vi`,
    `https://news.google.com/rss/search?q=${encodeURIComponent(homeEn + ' vs ' + awayEn + ' score')}&hl=en`,
  ];

  for (const rssUrl of googleNewsUrls) {
    try {
      console.log(`[Scraper] Đang quét Google News RSS...`);
      const rssXml = await fetchHtml(rssUrl);
      if (!rssXml || rssXml.length < 100) continue;

      // Trích xuất tiêu đề và mô tả từ RSS (chỉ lấy 15 bài đầu tiên)
      const titles = Array.from(rssXml.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi))
        .map(m => m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim())
        .slice(0, 15);
      
      const descriptions = Array.from(rssXml.matchAll(/<description[^>]*>([\s\S]*?)<\/description>/gi))
        .map(m => m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, ' ').trim())
        .slice(0, 15);

      const combinedText = [...titles, ...descriptions].join('\n');
      
      if (combinedText.length < 50) continue;

      // PRE-FILTER: Kiểm tra xem text có chứa tên đội không TRƯỚC KHI gọi Gemini (tiết kiệm quota)
      const textLower = combinedText.toLowerCase();
      const hasTeamName = textLower.includes(homeTeam.toLowerCase()) || 
                          textLower.includes(awayTeam.toLowerCase()) ||
                          textLower.includes(homeEn.toLowerCase()) || 
                          textLower.includes(awayEn.toLowerCase());
      
      if (!hasTeamName) {
        console.log(`[Scraper] ⏭️ Bỏ qua RSS (không chứa tên đội), tiết kiệm 1 lượt Gemini.`);
        continue;
      }

      const result = await analyzeWithGemini(combinedText, homeTeam, awayTeam);
      if (result && result.home_score !== null && result.away_score !== null) {
        console.log(`[Scraper] ✅ Chốt tỷ số từ Google News RSS: ${result.home_score} - ${result.away_score} (${result.status})`);
        return result;
      }
    } catch (err) {
      console.error('[Scraper] Lỗi Google News RSS:', err);
    }
  }



  console.log('[Scraper] ❌ Không tìm thấy kết quả từ tất cả các nguồn.');
  return null;
}
