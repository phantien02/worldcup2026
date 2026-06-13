async function test() {
  const res = await fetch('https://vnexpress.net/the-thao/world-cup-2026/lich-thi-dau');
  const text = await res.text();
  
  // Extract all tran-dau links
  const links = text.match(/href="([^"]+\/tran-dau\/[^"]+)"/g);
  if (links) {
    const uniqueLinks = [...new Set(links)];
    console.log("Found detail links:", uniqueLinks.slice(0, 10));
  } else {
    console.log("No tran-dau links found on schedule page");
  }
}
test();
