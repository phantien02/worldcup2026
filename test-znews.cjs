const url = 'https://znews.vn/bong-da/lich-thi-dau/406-0/world-cup.html';

async function checkZnews() {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log("Status:", res.status);
    const html = await res.text();
    console.log("Length of HTML:", html.length);
    
    if (res.status === 403 || html.includes('Just a moment') || html.includes('Cloudflare')) {
       console.log("=> BLOCKED BY CLOUDFLARE");
       return;
    }

    if (html.toLowerCase().includes('qatar')) {
      console.log("=> Found 'Qatar' in HTML!");
      const idx = html.toLowerCase().indexOf('qatar');
      console.log("Context:");
      console.log(html.substring(Math.max(0, idx - 150), idx + 150));
    } else {
      console.log("=> 'Qatar' NOT found in HTML.");
    }

    if (html.includes('1 - 1') || html.includes('1-1')) {
      console.log("=> Found '1-1' score in HTML!");
      const idx = html.indexOf('1-1') !== -1 ? html.indexOf('1-1') : html.indexOf('1 - 1');
      console.log("Context:");
      console.log(html.substring(Math.max(0, idx - 100), idx + 100));
    } else {
      console.log("=> '1-1' NOT found in HTML.");
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
}

checkZnews();
