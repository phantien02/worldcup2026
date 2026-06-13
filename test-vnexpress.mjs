async function run() {
  const res = await fetch('https://vnexpress.net/the-thao/du-lieu-bong-da/tran-dau/1077755');
  const t = await res.text();
  const match = t.match(/class="[^"]*ic[^"]*"/g);
  if(match) console.log([...new Set(match)]);
}
run();
