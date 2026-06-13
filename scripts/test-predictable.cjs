async function test() {
  const teams = [
    ['han-quoc', 'ch-sec'],
    ['canada', 'bosnia'],
    ['my', 'paraguay']
  ];
  
  for (const [home, away] of teams) {
    const url = `https://thethao.vnexpress.net/match/${home}-vs-${away}`;
    console.log("Fetching:", url);
    const res = await fetch(url);
    console.log("Status:", res.status);
    if (res.status === 200) {
      const text = await res.text();
      console.log("Content length:", text.length);
      if (text.length > 500) {
        // Find if any goals are recorded by looking for "BÀN THẮNG" or similar
        console.log("Snippets:", text.substring(0, 100));
      }
    }
  }
}
test();
