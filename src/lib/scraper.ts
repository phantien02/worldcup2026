export interface ScrapeResult {
  home_score: number | null;
  away_score: number | null;
  status: 'pending' | 'live' | 'finished';
  match_time: string | null;
  evidence?: string | null;
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
  return cleanHtml.replace(/\s+/g, ' ').trim().substring(0, 5000);
}

async function fetchHtml(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout cho Google News
    
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

// =============================================
// LỌC RSS - Chỉ giữ bài liên quan
// =============================================
function filterRelevantItems(items: string[], homeTeam: string, awayTeam: string, homeEn: string, awayEn: string): string[] {
  const teamKeywords = [
    homeTeam.toLowerCase(), 
    awayTeam.toLowerCase(), 
    homeEn.toLowerCase(), 
    awayEn.toLowerCase()
  ];
  
  const spamKeywords = ['nhận định', 'dự đoán', 'soi kèo', 'tỷ lệ', 'prediction', 'odds', 'preview', 'kèo'];

  return items.filter(item => {
    const itemLower = item.toLowerCase();
    if (spamKeywords.some(keyword => itemLower.includes(keyword))) return false;
    return teamKeywords.some(keyword => itemLower.includes(keyword));
  });
}

// =============================================
// AI LLM - Xử lý văn bản bằng Gemini
// =============================================
export async function analyzeWithGemini(text: string, homeTeam: string, awayTeam: string): Promise<ScrapeResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Thiếu GEMINI_API_KEY trong biến môi trường');
    return null;
  }

  const homeEn = getEnglishName(homeTeam);
  const awayEn = getEnglishName(awayTeam);

  const prompt = `Bạn là chuyên gia phân tích bóng đá. Hãy đọc văn bản sau và tìm tỷ số hiện tại (nếu đang đá) hoặc tỷ số chung cuộc (nếu đã kết thúc) của trận đấu giữa "${homeTeam}" (hay "${homeEn}") (Đội nhà) và "${awayTeam}" (hay "${awayEn}") (Đội khách).

Trả về một JSON object duy nhất, định dạng chính xác như sau:
{
  "home_score": <số bàn thắng của đội nhà, hoặc null>,
  "away_score": <số bàn thắng của đội khách, hoặc null>,
  "status": "finished" (nếu trận đấu đã kết thúc), "live" (nếu đang diễn ra), hoặc "pending" (nếu chưa bắt đầu/không tìm thấy),
  "match_time": "FT" hoặc null,
  "evidence": "<trích nguyên văn đoạn text ngắn nhất chứa tỷ số mà bạn dùng để kết luận>"
}

- ĐẶC BIỆT LƯU Ý VỚI BÁO CHÍ (CLICKBAIT): Đôi khi báo chí giấu tỷ số chung cuộc ở các bài tổng kết (chỉ ghi "Kết quả", "Chiến thắng", "Bị loại"...).
- NẾU có bài báo tổng kết trận (chứa từ "Kết quả", "Highlight", "Sau trận", "Thắng", "Thua", "Bị loại", "Chung cuộc"): bạn PHẢI CHỐT SỔ (status: "finished"). Về tỷ số, HÃY ƯU TIÊN tìm tỷ số ngay trong bài tổng kết đó (ví dụ "hạ 2-1", "thắng 5-1"). NẾU VÀ CHỈ NẾU bài tổng kết hoàn toàn giấu tỷ số, bạn mới được phép lấy tỷ số cao nhất từ các bài "Trực tiếp" để chốt.
- NẾU HOÀN TOÀN KHÔNG có bài báo nào tổng kết, chỉ toàn là "Trực tiếp", "Live", "Đang diễn ra", thì bạn MỚI trả về status là "live".
- Nếu không tìm thấy tỷ số của ĐÚNG trận đấu này, hãy trả về { "home_score": null, "away_score": null, "status": "pending", "match_time": null, "evidence": null }.

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
    const parts = data.candidates?.[0]?.content?.parts || [];
    const resultText = parts.map((p: any) => p.text).join('\n');
    
    const match = resultText.match(/\{[\s\S]*\}/);
    if (!match) return null;
    
    const result = JSON.parse(match[0]);

    if (result.evidence) {
      console.log(`[Gemini] 📝 Evidence: "${result.evidence}"`);
    }
    
    if (typeof result.home_score !== 'undefined' && typeof result.away_score !== 'undefined' && result.status) {
      return result as ScrapeResult;
    }
    
    return null;
  } catch (error) {
    console.error('Lỗi phân tích LLM:', error);
    return null;
  }
}

interface RssSourceResult {
  result: ScrapeResult;
  source: string;
}

async function scrapeFromRss(rssUrl: string, homeTeam: string, awayTeam: string, homeEn: string, awayEn: string, sourceName: string, kickoffTime?: string): Promise<RssSourceResult | null> {
  try {
    console.log(`[Scraper] Đang quét ${sourceName}...`);
    const rssXml = await fetchHtml(rssUrl);
    if (!rssXml || rssXml.length < 100) return null;

    const allTitles = Array.from(rssXml.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi))
      .map(m => m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim())
      .slice(0, 15);
    
    const allDescriptions = Array.from(rssXml.matchAll(/<description[^>]*>([\s\S]*?)<\/description>/gi))
      .map(m => m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, ' ').trim())
      .slice(0, 15);

    const relevantTitles = filterRelevantItems(allTitles, homeTeam, awayTeam, homeEn, awayEn);
    const relevantDescriptions = filterRelevantItems(allDescriptions, homeTeam, awayTeam, homeEn, awayEn);

    console.log(`[Scraper] 🔍 ${sourceName}: ${allTitles.length} tiêu đề → lọc còn ${relevantTitles.length} | ${allDescriptions.length} mô tả → lọc còn ${relevantDescriptions.length}`);

    const combinedText = [...relevantTitles, ...relevantDescriptions].join('\n');
    
    if (combinedText.length < 30) {
      console.log(`[Scraper] ⏭️ ${sourceName}: Sau lọc không còn nội dung liên quan.`);
      return null;
    }

    // 100% LLM: Gọi thẳng AI
    const aiResult = await analyzeWithGemini(combinedText, homeTeam, awayTeam);
    
    if (aiResult && aiResult.home_score !== null && aiResult.away_score !== null) {
      console.log(`[Scraper] 🤖 ${sourceName} - AI trả về: ${aiResult.home_score}-${aiResult.away_score} (${aiResult.status})`);
      
      // SANITY CHECK: Xác thực tính toàn vẹn (Cross-check AI)
      let finalStatus = aiResult.status;
      
      // 1. Status Sanity Check (Xác thực từ khóa Kết thúc)
      if (aiResult.status === 'finished') {
        const isFinishedKeyword = /(ft|full[- ]?time|final|kết thúc|chung cuộc|result|hết giờ|end|finished|giành chiến thắng|đánh bại|thắng lợi|vượt qua|\bwin\b|\bwon\b|\bbeat\b|\bdefeat\b|kết quả|thắng|thua|bị loại|highlight)/i.test(combinedText);
        
        if (!isFinishedKeyword) {
          let diffMinutes = 0;
          if (kickoffTime) {
            diffMinutes = (Date.now() - new Date(kickoffTime).getTime()) / (1000 * 60);
          }
          
          if (diffMinutes < 140) {
            console.log(`[Scraper] ⚠️ AI báo finished nhưng bài báo không có từ khóa kết thúc (trận đấu mới qua ${Math.round(diffMinutes)}p) -> ÉP VỀ LIVE!`);
            finalStatus = 'live';
          }
        }
      }

      // 2. Number Sanity Check (Xác thực AI không bịa ra con số ảo)
      const ev = (aiResult.evidence || '').toLowerCase();
      const txt = combinedText.toLowerCase();
      // Nếu là số lớn (>0), thì số đó phải xuất hiện trong evidence hoặc text! (0 đôi khi bị báo bỏ qua ví dụ "thắng tối thiểu")
      if (aiResult.home_score > 0 && !txt.includes(aiResult.home_score.toString())) {
        console.log(`[Scraper] 🛑 AI ẢO GIÁC: Không tìm thấy số ${aiResult.home_score} trong bài báo! Từ chối kết quả.`);
        return null;
      }
      if (aiResult.away_score > 0 && !txt.includes(aiResult.away_score.toString())) {
        console.log(`[Scraper] 🛑 AI ẢO GIÁC: Không tìm thấy số ${aiResult.away_score} trong bài báo! Từ chối kết quả.`);
        return null;
      }

      return { 
        result: { ...aiResult, status: finalStatus, match_time: finalStatus === 'finished' ? 'FT' : null }, 
        source: sourceName 
      };
    }

  } catch (err) {
    console.error(`[Scraper] Lỗi ${sourceName}:`, err);
  }

  return null;
}

export async function scrapeLiveScore(homeTeam: string, awayTeam: string, kickoffTime?: string): Promise<ScrapeResult | null> {
  const homeEn = getEnglishName(homeTeam);
  const awayEn = getEnglishName(awayTeam);

  console.log(`[Scraper] Đang tìm kết quả cho ${homeTeam} vs ${awayTeam}...`);

  const rssVN = `https://news.google.com/rss/search?q=${encodeURIComponent('kết quả ' + homeTeam + ' vs ' + awayTeam)}&hl=vi&gl=VN&ceid=VN:vi`;

  // CẢI TIẾN: Lược bỏ nguồn Tiếng Anh và cơ chế cross-check để giảm tải, tránh xung đột theo yêu cầu
  const resultVN = await scrapeFromRss(rssVN, homeTeam, awayTeam, homeEn, awayEn, 'RSS Tiếng Việt', kickoffTime);

  if (resultVN) {
    return resultVN.result;
  }

  console.log('[Scraper] ❌ Không tìm thấy kết quả từ nguồn RSS Tiếng Việt.');
  return null;
}
