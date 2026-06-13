async function test() {
  const res = await fetch('https://vnexpress.net/the-thao/world-cup-2026/lich-thi-dau');
  const text = await res.text();
  
  // Look for iframe
  const iframes = text.match(/<iframe[^>]*>/gi);
  console.log("Iframes:", iframes);
  
  // Look for API endpoints in the page
  const apis = text.match(/(https?:\/\/[^\s"'`]+api[^\s"'`]+)/gi);
  if (apis) {
    console.log("APIs:", [...new Set(apis)].slice(0, 10));
  }
}
test();
