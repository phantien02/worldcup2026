async function test() {
  const urls = [
    'https://vnexpress.net/the-thao/du-lieu-bong-da/tran-mexico-vs-nam-phi',
    'https://vnexpress.net/the-thao/du-lieu-bong-da/tran-mexico-vs-nam-phi-2026',
    'https://thethao.vnexpress.net/match/mexico-vs-nam-phi',
    'https://vnexpress.net/the-thao/world-cup-2026/tran-dau/1489369/mexico-nam-phi/dien-bien'
  ];
  
  for (const url of urls) {
    console.log("Fetching:", url);
    const res = await fetch(url);
    console.log("Status:", res.status);
    const text = await res.text();
    if (text.includes('Jimenez')) {
      console.log("Found Jimenez in", url);
    }
  }
}
test();
