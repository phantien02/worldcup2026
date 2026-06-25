const url = 'https://thethao247.vn/world-cup/';

async function check() {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  console.log("Status:", res.status);
  console.log("Redirected:", res.redirected);
  console.log("HTML Start:", html.substring(0, 500));
}
check();
