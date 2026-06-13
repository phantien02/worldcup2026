async function test() {
  const query = 'site:vnexpress.net world cup 2026 "hàn quốc" "ch séc" dien-bien';
  const res = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query));
  const text = await res.text();
  
  const links = text.match(/https?:\/\/vnexpress\.net\/the-thao\/world-cup-2026\/tran-dau\/\d+\/[^\/]+\/dien-bien/g);
  if (links) {
    console.log("Found links via DuckDuckGo:", [...new Set(links)]);
  } else {
    console.log("No links found via DuckDuckGo");
  }
}
test();
