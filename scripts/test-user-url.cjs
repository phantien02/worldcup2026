async function test() {
  const res = await fetch('https://vnexpress.net/the-thao/world-cup-2026/tran-dau/1538999/han-quoc-ch-czech/dien-bien');
  const text = await res.text();
  console.log("Length:", text.length);
  if (text.includes("BÀN THẮNG") || text.includes("bong-da") || text.includes("goal")) {
    console.log("Goal found!");
  } else {
    console.log("No goal found!");
  }
}
test();
