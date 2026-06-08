const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching Wikipedia flags page...");
  // Using a valid User-Agent is critical for Wikipedia
  const res = await fetch("https://vi.wikipedia.org/wiki/Danh_s%C3%A1ch_qu%E1%BB%91c_k%E1%BB%B3", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html"
    }
  });

  if (!res.ok) {
    console.error("Failed to fetch Wikipedia:", res.status);
    return;
  }

  const html = await res.text();
  console.log("Fetched Wikipedia HTML length:", html.length);

  // We need to match rows that look like:
  // <a href="/wiki/T%E1%BA%ADp_tin:Flag_of_Vietnam.svg" class="image" title="Quốc kỳ Việt Nam"><img alt="Quốc kỳ Việt Nam" src="//upload.wikimedia.org/wikipedia/commons/thumb/2/21/Flag_of_Vietnam.svg/30px-Flag_of_Vietnam.svg.png" ...></a>
  // <td><a href="/wiki/Vi%E1%BB%87t_Nam" title="Việt Nam">Việt Nam</a></td>

  // Wikipedia HTML structure varies, let's use regex to find pairs of Country Name and Flag URL
  const flagRegex = /<img[^>]*src="(\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/[^"]+)"[^>]*>/g;
  let match;
  const flagUrls = [];
  while ((match = flagRegex.exec(html)) !== null) {
    flagUrls.push("https:" + match[1]);
  }
  
  // Since parsing HTML with regex is tough, let's do something simpler:
  // Let's get all teams from our database first
  const { data: teams, error } = await supabase.from('teams').select('id, name');
  if (error) {
    console.error("DB Error:", error);
    return;
  }

  console.log(`Found ${teams.length} teams in database.`);
  
  // Let's create a map of normalized names to flag URLs
  // To avoid complex regex, we can search the HTML for the country name, then look backwards for the nearest img src
  let updatedCount = 0;
  for (const team of teams) {
      let teamName = team.name;
      // Normalizations for Wikipedia mismatches
      if(teamName === 'Anh') teamName = 'Vương quốc Liên hiệp Anh và Bắc Ireland';
      if(teamName === 'Hàn Quốc') teamName = 'Hàn Quốc'; // Wikipedia uses Hàn Quốc or Đại Hàn Dân Quốc
      if(teamName === 'Mỹ') teamName = 'Hoa Kỳ';
      
      const searchStr = `title="${teamName}"`;
      const idx = html.indexOf(searchStr);
      
      if (idx !== -1) {
          // Look backwards for the nearest flag image
          const snippet = html.substring(Math.max(0, idx - 1000), idx + 200);
          const imgMatch = snippet.match(/src="(\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/[^"]+)"/);
          
          if (imgMatch) {
              // Convert thumbnail to a larger size by replacing the pixel width, e.g. 23px- to 120px-
              let imgUrl = "https:" + imgMatch[1];
              imgUrl = imgUrl.replace(/\/\d+px-/, '/120px-');
              
              const { error: updateError } = await supabase
                .from('teams')
                .update({ flag_url: imgUrl })
                .eq('id', team.id);
                
              if (!updateError) {
                  updatedCount++;
                  console.log(`Updated ${team.name} -> ${imgUrl}`);
              }
          }
      }
  }

  console.log(`Successfully updated flags for ${updatedCount} / ${teams.length} teams.`);
}

run();
