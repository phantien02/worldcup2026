async function test() {
  const res = await fetch('https://thethao.vnexpress.net/match/mexico-vs-nam-phi');
  const text = await res.text();
  console.log("mexico-vs-nam-phi length:", text.length);
  if (text.includes("Jimenez")) {
    console.log("Found Jimenez!");
  } else {
    console.log("NOT FOUND!");
  }
}
test();
