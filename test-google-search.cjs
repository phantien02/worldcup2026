const url = 'https://www.google.com/search?q=qatar+switzerland+score+world+cup+2026';

async function checkGoogle() {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  console.log("Length of HTML:", html.length);
  
  if (html.includes('Qatar') || html.includes('Switzerland')) {
    console.log("Found teams in HTML.");
    const index = html.indexOf('Qatar');
    if (index !== -1) {
      console.log("Context around Qatar:");
      console.log(html.substring(Math.max(0, index - 200), index + 200));
    }
  } else {
    console.log("Teams NOT found in HTML.");
  }
}

checkGoogle();
