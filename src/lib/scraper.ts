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
// =============================================
function tryRegexExtract(text: string, homeTeam: string, awayTeam: string, homeEn: string, awayEn: string): ScrapeResult | null {
  // Pattern 1: Tên đội 1 + số + số + Tên đội 2 (vd: Vietnam 2-1 Thailand)
  const pattern1 = new RegExp(`(?:${homeTeam}|${homeEn})\\s+(\\d+)\\s*-\\s*(\\d+)\\s+(?:${awayTeam}|${awayEn})`, 'gi');
  const pattern1En = new RegExp(`(?:${homeEn}|${homeTeam})\\s+(\\d+)\\s*-\\s*(\\d+)\\s+(?:${awayEn}|${awayTeam})`, 'gi');

  // Pattern 2: Tên đội 2 + số + số + Tên đội 1 (ngược lại)
  const pattern2 = new RegExp(`(?:${awayTeam}|${awayEn})\\s+(\\d+)\\s*-\\s*(\\d+)\\s+(?:${homeTeam}|${homeEn})`, 'gi');
  const pattern2En = new RegExp(`(?:${awayEn}|${awayTeam})\\s+(\\d+)\\s*-\\s*(\\d+)\\s+(?:${homeEn}|${homeTeam})`, 'gi');

  // Pattern 3: Tỷ số đứng trước tên đội (vd: 2-1 nghiêng về Vietnam trước Thailand)
  const pattern3 = new RegExp(`(\\d+)\\s*-\\s*(\\d+).{1,50}?(?:${homeTeam}|${homeEn}).{1,50}?(?:${awayTeam}|${awayEn})`, 'gi');

  const scorePatterns = [pattern1, pattern2, pattern3, pattern1En, pattern2En];

  let bestMatch: { home_score: number, away_score: number, status: 'live' | 'finished', patternIdx: number } | null = null;
  let maxTotal = -1;

  for (let i = 0; i < scorePatterns.length; i++) {
    const globalPattern = scorePatterns[i];
    let match;
    
    // Quét toàn bộ văn bản để tìm TẤT CẢ các tỷ số
    while ((match = globalPattern.exec(text)) !== null) {
      let homeScore, awayScore;
      
      if (i === 1 || i === 4) { // pattern ngược (away - home)
        homeScore = parseInt(match[2], 10);
        awayScore = parseInt(match[1], 10);
      } else { // pattern xuôi (home - away)
        homeScore = parseInt(match[1], 10);
        awayScore = parseInt(match[2], 10);
      }

      // Check xung quanh để xem hiệp 1 hay kết thúc
      const surroundingText = text.substring(
        Math.max(0, (match.index || 0) - 100),
        Math.min(text.length, (match.index || 0) + match[0].length + 100)
      ).toLowerCase();

      // SỬA LỖI DIACRITICS: Bỏ \b cho tiếng Việt, dùng các cụm từ dài an toàn hơn
      const isFinished = /(ft|full[- ]?time|final|kết thúc|chung cuộc|result|hết giờ|end|finished|giành chiến thắng|đánh bại|thắng lợi|vượt qua|\bwin\b|\bwon\b|\bbeat\b|\bdefeat\b)/i.test(surroundingText);
      const isHalfTime = /(ht|half[- ]?time|hiệp 1|hiệp một)/i.test(surroundingText);

      // Nếu rõ ràng là HT thì bỏ qua
      if (isHalfTime && !isFinished) {
        console.log(`[Regex] ⏭️ Bỏ qua tỷ số hiệp 1: ${homeScore}-${awayScore}`);
        continue;
      }

      const totalGoals = homeScore + awayScore;
      
      // LUẬT TỶ SỐ CAO NHẤT: Chỉ lấy tỷ số nếu tổng bàn thắng lớn hơn (hoặc bằng nhưng trạng thái xịn hơn)
      if (totalGoals > maxTotal) {
        maxTotal = totalGoals;
        bestMatch = { home_score: homeScore, away_score: awayScore, status: isFinished ? 'finished' : 'live', patternIdx: i };
      } else if (totalGoals === maxTotal && isFinished && bestMatch && bestMatch.status === 'live') {
        bestMatch.status = 'finished'; // Ưu tiên finished nếu bằng điểm
      }
    }
  }

  if (bestMatch) {
    console.log(`[Regex] ✅ Bắt được tỷ số CAO NHẤT: ${homeTeam} ${bestMatch.home_score} - ${bestMatch.away_score} ${awayTeam} (${bestMatch.status}) | Pattern #${bestMatch.patternIdx + 1}`);
    return {
      home_score: bestMatch.home_score,
      away_score: bestMatch.away_score,
      status: bestMatch.status,
      match_time: bestMatch.status === 'finished' ? 'FT' : null,
      events: null
    };
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
  
  const spamKeywords = ['nhận định', 'dự đoán', 'soi kèo', 'tỷ lệ', 'prediction', 'odds', 'preview', 'kèo'];

  return items.filter(item => {
    const itemLower = item.toLowerCase();
    
    // Loại bài soi kèo
    if (spamKeywords.some(keyword => itemLower.includes(keyword))) {
      return false;
    }
    
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
- CHỈ lấy tỷ số của đúng trận đấu giữa "${homeTeam}" (hoặc "${homeEn}") và "${awayTeam}" (hoặc "${awayEn}"). Có thể báo chí dùng các tên gọi tắt, hãy linh hoạt hiểu ngữ cảnh. Tuyệt đối KHÔNG lấy nhầm tỷ số của các đội bóng khác.
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
           let diffMinutes = 0;
           if (kickoffTime) {
             diffMinutes = (Date.now() - new Date(kickoffTime).getTime()) / (1000 * 60);
           }
           
           if (diffMinutes > 140) {
              console.log(`[Scraper] ✅ Trận đã đá ${Math.round(diffMinutes)} phút (> 140p), tin tưởng AI báo finished.`);
              finalStatus = 'finished';
           } else {
              const evidenceLower = (aiResult.evidence || '').toLowerCase();
              if (evidenceLower.includes('trực tiếp') || evidenceLower.includes('live') || evidenceLower.includes('đang diễn ra')) {
                 finalStatus = 'live';
                 console.log(`[Scraper] ⚠️ AI báo finished nhưng evidence chứa chữ LIVE → ÉP về LIVE`);
              } else {
                 finalStatus = 'live'; // Thà trễ còn hơn đóng non trận đấu
                 console.log(`[Scraper] ⚠️ AI báo finished nhưng Regex không thấy chữ kết thúc → ÉP về LIVE cho an toàn`);
              }
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

  console.log(`[Scraper] Đang tìm kết quả cho ${homeTeam} vs ${awayTeam}...`);

  const rssVN = `https://news.google.com/rss/search?q=${encodeURIComponent(homeTeam + ' vs ' + awayTeam + ' World Cup 2026 kết quả')}&hl=vi&gl=VN&ceid=VN:vi`;

  // CẢI TIẾN: Lược bỏ nguồn Tiếng Anh và cơ chế cross-check để giảm tải, tránh xung đột theo yêu cầu
  const resultVN = await scrapeFromRss(rssVN, homeTeam, awayTeam, homeEn, awayEn, 'RSS Tiếng Việt', kickoffTime);

  if (resultVN) {
    return resultVN.result;
  }

  console.log('[Scraper] ❌ Không tìm thấy kết quả từ nguồn RSS Tiếng Việt.');
  return null;
}
