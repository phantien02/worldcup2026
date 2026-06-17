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
// CẢI TIẾN #2: REGEX PRE-EXTRACTION
// Thử bắt tỷ số bằng Regex trước khi gọi AI (tiết kiệm quota + nhanh hơn)
// =============================================
function tryRegexExtract(text: string, homeTeam: string, awayTeam: string, homeEn: string, awayEn: string): ScrapeResult | null {
  const homeLower = homeTeam.toLowerCase();
  const awayLower = awayTeam.toLowerCase();
  const homeEnLower = homeEn.toLowerCase();
  const awayEnLower = awayEn.toLowerCase();
  const textLower = text.toLowerCase();

  // Escape special regex characters in team names
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Tạo danh sách tên đội để match (cả Tiếng Việt và Tiếng Anh)
  const homeNames = [escapeRegex(homeTeam), escapeRegex(homeEn)].filter((v, i, a) => a.indexOf(v) === i);
  const awayNames = [escapeRegex(awayTeam), escapeRegex(awayEn)].filter((v, i, a) => a.indexOf(v) === i);

  const homePattern = homeNames.join('|');
  const awayPattern = awayNames.join('|');

  // Pattern: "HomeTeam X - Y AwayTeam" hoặc "HomeTeam X-Y AwayTeam"
  // Hỗ trợ các dạng: 4-1, 4 - 1, 4:1, 4 : 1
  const patterns = [
    // Home trước, Away sau: "Norway 4-1 Iraq"
    new RegExp(`(?:${homePattern})\\s*[:\\-–]?\\s*(\\d+)\\s*[\\-–:]\\s*(\\d+)\\s*[:\\-–]?\\s*(?:${awayPattern})`, 'i'),
    // Home trước, Away sau (có FT/HT): "Norway 4-1 Iraq (FT)"
    new RegExp(`(?:${homePattern})\\s+(\\d+)\\s*[\\-–:]\\s*(\\d+)\\s+(?:${awayPattern})`, 'i'),
    // Away trước, Home sau (đảo vị trí): "Iraq 1-4 Norway" 
    new RegExp(`(?:${awayPattern})\\s*[:\\-–]?\\s*(\\d+)\\s*[\\-–:]\\s*(\\d+)\\s*[:\\-–]?\\s*(?:${homePattern})`, 'i'),
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) {
      let homeScore: number, awayScore: number;

      if (i <= 1) {
        // Home trước, Away sau
        homeScore = parseInt(match[1]);
        awayScore = parseInt(match[2]);
      } else {
        // Away trước, Home sau (i === 2) → phải đảo lại
        awayScore = parseInt(match[1]);
        homeScore = parseInt(match[2]);
      }

      // Kiểm tra xem có chữ FT / Full-Time / kết thúc gần kết quả không
      const surroundingText = text.substring(
        Math.max(0, (match.index || 0) - 100),
        Math.min(text.length, (match.index || 0) + match[0].length + 100)
      ).toLowerCase();

      const isFinished = /\b(ft|full[- ]?time|final|kết thúc|chung cuộc|result|hết giờ|end|finished)\b/i.test(surroundingText);
      const isHalfTime = /\b(ht|half[- ]?time|hiệp 1|hiệp một)\b/i.test(surroundingText);

      // Nếu rõ ràng là HT thì bỏ qua, không lấy tỷ số hiệp 1
      if (isHalfTime && !isFinished) {
        console.log(`[Regex] ⏭️ Bỏ qua tỷ số hiệp 1: ${homeScore}-${awayScore}`);
        continue;
      }

      const status = isFinished ? 'finished' : 'live';

      console.log(`[Regex] ✅ Bắt được tỷ số: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam} (${status}) | Pattern #${i + 1}`);
      return {
        home_score: homeScore,
        away_score: awayScore,
        status,
        match_time: isFinished ? 'FT' : null,
        events: null
      };
    }
  }

  return null;
}

// =============================================
// CẢI TIẾN #1: LỌC RSS - Chỉ giữ bài liên quan
// =============================================
function filterRelevantItems(items: string[], homeTeam: string, awayTeam: string, homeEn: string, awayEn: string): string[] {
  const teamKeywords = [
    homeTeam.toLowerCase(), 
    awayTeam.toLowerCase(), 
    homeEn.toLowerCase(), 
    awayEn.toLowerCase()
  ];

  return items.filter(item => {
    const itemLower = item.toLowerCase();
    // Chỉ giữ bài mà tiêu đề/mô tả chứa tên ÍT NHẤT 1 trong 2 đội
    return teamKeywords.some(keyword => itemLower.includes(keyword));
  });
}

// =============================================
// CẢI TIẾN #3: Prompt AI cải tiến - yêu cầu trích dẫn evidence
// =============================================
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
  "match_time": "FT" hoặc null,
  "evidence": "<trích nguyên văn đoạn text ngắn nhất chứa tỷ số mà bạn dùng để kết luận>"
}

Lưu ý quan trọng:
- CHỈ trả về JSON object, không kèm markdown, không giải thích.
- CHỈ lấy tỷ số của đúng trận đấu giữa "${homeTeam}" và "${awayTeam}". Tuyệt đối KHÔNG lấy nhầm tỷ số của các đội bóng khác.
- NẾU evidence chứa chữ "Trực tiếp", "Live", "Đang diễn ra", hoặc chỉ đề cập tỷ số Hiệp 1, bạn PHẢI trả về status là "live", TUYỆT ĐỐI KHÔNG được trả về "finished".
- CHỈ trả về "finished" nếu chắc chắn trận đấu đã có chữ "FT", "Kết thúc", "Hết giờ".
- Chú ý thứ tự Đội nhà (Home) và Đội khách (Away).
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
    
    // Parse JSON using regex to find the first { ... } block
    const match = resultText.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('Không tìm thấy JSON trong chuỗi trả về:', resultText);
      return null;
    }
    
    const result = JSON.parse(match[0]);

    // Log evidence để debug khi có lỗi
    if (result.evidence) {
      console.log(`[Gemini] 📝 Evidence: "${result.evidence}"`);
    }
    
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

// =============================================
// CẢI TIẾN #4: CROSS-CHECK giữa nguồn VN và EN
// =============================================

interface RssSourceResult {
  result: ScrapeResult;
  source: string;
}

async function scrapeFromRss(rssUrl: string, homeTeam: string, awayTeam: string, homeEn: string, awayEn: string, sourceName: string): Promise<RssSourceResult | null> {
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

    // CẢI TIẾN #1: Lọc chỉ giữ bài có chứa tên đội
    const relevantTitles = filterRelevantItems(allTitles, homeTeam, awayTeam, homeEn, awayEn);
    const relevantDescriptions = filterRelevantItems(allDescriptions, homeTeam, awayTeam, homeEn, awayEn);

    console.log(`[Scraper] 🔍 ${sourceName}: ${allTitles.length} tiêu đề → lọc còn ${relevantTitles.length} | ${allDescriptions.length} mô tả → lọc còn ${relevantDescriptions.length}`);

    const combinedText = [...relevantTitles, ...relevantDescriptions].join('\n');
    
    if (combinedText.length < 30) {
      console.log(`[Scraper] ⏭️ ${sourceName}: Sau lọc không còn nội dung liên quan.`);
      return null;
    }

    // Bước 2: Thử Regex trước (nhanh, miễn phí)
    const regexResult = tryRegexExtract(combinedText, homeTeam, awayTeam, homeEn, awayEn);
    if (regexResult) {
      console.log(`[Scraper] ⚡ ${sourceName} - Regex bắt được: ${regexResult.home_score}-${regexResult.away_score} (${regexResult.status})`);
    }

    // Bước 3: LUÔN gọi AI (có evidence) để xác nhận hoặc bổ sung
    const aiResult = await analyzeWithGemini(combinedText, homeTeam, awayTeam);
    if (aiResult && aiResult.home_score !== null && aiResult.away_score !== null) {
      console.log(`[Scraper] 🤖 ${sourceName} - AI trả về: ${aiResult.home_score}-${aiResult.away_score} (${aiResult.status})`);
    }

    // Quyết định kết quả cuối cùng cho nguồn này:
    if (regexResult && regexResult.home_score !== null && aiResult && aiResult.home_score !== null) {
      // CẢ HAI đều có kết quả → so sánh
      if (regexResult.home_score === aiResult.home_score && regexResult.away_score === aiResult.away_score) {
        let finalStatus = aiResult.status;
        
        // Nếu AI bảo finished nhưng Regex bảo live (chưa thấy từ khóa kết thúc), ép về live cho an toàn
        if (aiResult.status === 'finished' && regexResult.status === 'live') {
           const evidenceLower = (aiResult.evidence || '').toLowerCase();
           if (evidenceLower.includes('trực tiếp') || evidenceLower.includes('live') || evidenceLower.includes('đang diễn ra')) {
              finalStatus = 'live';
              console.log(`[Scraper] ⚠️ AI báo finished nhưng evidence chứa chữ LIVE → ÉP về LIVE`);
           } else {
              finalStatus = 'live'; // Thà trễ còn hơn đóng non trận đấu
              console.log(`[Scraper] ⚠️ AI báo finished nhưng Regex không thấy chữ kết thúc → ÉP về LIVE cho an toàn`);
           }
        }

        console.log(`[Scraper] ✅✅ ${sourceName} - Regex & AI ĐỒNG Ý: ${aiResult.home_score}-${aiResult.away_score} (${finalStatus})`);
        return { result: { ...aiResult, status: finalStatus, match_time: finalStatus === 'finished' ? 'FT' : null }, source: sourceName };
      } else {
        // KHÁC NHAU → Ưu tiên AI vì có evidence, nhưng log cảnh báo
        console.log(`[Scraper] ⚠️ ${sourceName} - Regex (${regexResult.home_score}-${regexResult.away_score}) ≠ AI (${aiResult.home_score}-${aiResult.away_score}) → Ưu tiên AI (có evidence).`);
        return { result: aiResult, source: sourceName };
      }
    }

    // Chỉ AI có kết quả (Regex fail) → dùng AI
    if (aiResult && aiResult.home_score !== null && aiResult.away_score !== null) {
      console.log(`[Scraper] 🤖 ${sourceName} - Chỉ AI có kết quả: ${aiResult.home_score}-${aiResult.away_score} (${aiResult.status})`);
      return { result: aiResult, source: sourceName };
    }

    // Chỉ Regex có kết quả (AI fail) → dùng Regex nhưng cảnh báo
    if (regexResult && regexResult.home_score !== null && regexResult.away_score !== null) {
      console.log(`[Scraper] ⚡ ${sourceName} - Chỉ Regex có kết quả (AI fail): ${regexResult.home_score}-${regexResult.away_score} (${regexResult.status})`);
      return { result: regexResult, source: sourceName };
    }

  } catch (err) {
    console.error(`[Scraper] Lỗi ${sourceName}:`, err);
  }

  return null;
}

export async function scrapeLiveScore(homeTeam: string, awayTeam: string, kickoffTime?: string): Promise<ScrapeResult | null> {
  const homeEn = getEnglishName(homeTeam);
  const awayEn = getEnglishName(awayTeam);

  console.log(`[Scraper] Đang tìm kết quả cho ${homeTeam} vs ${awayTeam} (${homeEn} vs ${awayEn})...`);

  const rssVN = `https://news.google.com/rss/search?q=${encodeURIComponent(homeTeam + ' vs ' + awayTeam + ' World Cup 2026 kết quả')}&hl=vi&gl=VN&ceid=VN:vi`;
  const rssEN = `https://news.google.com/rss/search?q=${encodeURIComponent(homeEn + ' vs ' + awayEn + ' World Cup 2026 score')}&hl=en`;

  // CẢI TIẾN #4: Cào cả 2 nguồn song song, sau đó cross-check
  const [resultVN, resultEN] = await Promise.all([
    scrapeFromRss(rssVN, homeTeam, awayTeam, homeEn, awayEn, 'RSS Tiếng Việt'),
    scrapeFromRss(rssEN, homeTeam, awayTeam, homeEn, awayEn, 'RSS Tiếng Anh'),
  ]);

  // Case 1: Cả 2 nguồn đều có kết quả → So sánh cross-check
  if (resultVN && resultEN) {
    if (resultVN.result.home_score === resultEN.result.home_score &&
        resultVN.result.away_score === resultEN.result.away_score) {
      console.log(`[Scraper] ✅✅ CROSS-CHECK KHỚP: ${resultVN.result.home_score}-${resultVN.result.away_score} (VN: ${resultVN.result.status}, EN: ${resultEN.result.status})`);
      // Ưu tiên status "finished" nếu 1 trong 2 nguồn xác nhận
      const finalStatus = (resultVN.result.status === 'finished' || resultEN.result.status === 'finished') ? 'finished' : resultVN.result.status;
      return {
        ...resultVN.result,
        status: finalStatus,
        match_time: finalStatus === 'finished' ? 'FT' : resultVN.result.match_time,
      };
    } else {
      // 2 nguồn khác tỷ số → KHÔNG CHẤP NHẬN, quá rủi ro
      console.log(`[Scraper] ⚠️ CROSS-CHECK KHÔNG KHỚP! VN: ${resultVN.result.home_score}-${resultVN.result.away_score} vs EN: ${resultEN.result.home_score}-${resultEN.result.away_score} → BỎ QUA, chờ lần cào sau.`);
      return null;
    }
  }

  // Case 2: Chỉ 1 nguồn có kết quả → Chấp nhận nhưng log cảnh báo
  if (resultVN) {
    console.log(`[Scraper] ✅ Chỉ có nguồn VN: ${resultVN.result.home_score}-${resultVN.result.away_score} (${resultVN.result.status}) - Không có nguồn EN để cross-check.`);
    return resultVN.result;
  }

  if (resultEN) {
    console.log(`[Scraper] ✅ Chỉ có nguồn EN: ${resultEN.result.home_score}-${resultEN.result.away_score} (${resultEN.result.status}) - Không có nguồn VN để cross-check.`);
    return resultEN.result;
  }

  // Case 3: Không nguồn nào có kết quả
  console.log('[Scraper] ❌ Không tìm thấy kết quả từ cả 2 nguồn.');
  return null;
}
