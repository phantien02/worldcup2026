async function test() {
  const res = await fetch('https://vnexpress.net/the-thao/world-cup-2026/lich-thi-dau');
  const text = await res.text();
  
  // Look for any JSON data or script tags containing match IDs
  const matches = text.match(/1489369|1538999|1539000|1489370/g);
  console.log("Found match IDs in HTML?", matches);
  
  const scriptTags = text.match(/<script[\s\S]*?>[\s\S]*?<\/script>/gi);
  console.log("Total script tags:", scriptTags ? scriptTags.length : 0);
  
  if (scriptTags) {
    for (const script of scriptTags) {
      if (script.includes("1489369")) {
         console.log("Found ID in script:", script.substring(0, 500));
      }
    }
  }
}
test();
