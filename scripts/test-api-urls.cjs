async function test() {
  const res = await fetch('https://vnexpress.net/the-thao/world-cup-2026/lich-thi-dau');
  const text = await res.text();
  
  const urls = text.match(/https?:\/\/[^\s"'`<>]+/gi);
  if (urls) {
    const apiUrls = urls.filter(u => u.includes('api') || u.includes('json') || u.includes('data'));
    console.log("Possible APIs:", [...new Set(apiUrls)]);
  }
}
test();
