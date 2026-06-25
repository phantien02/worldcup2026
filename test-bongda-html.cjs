const url = 'https://bong-da.com/the-gioi/world-cup/livescore';

async function checkHtml() {
  const res = await fetch(url);
  const html = await res.text();
  console.log("Length of HTML:", html.length);
  if (html.includes("Qatar")) {
    console.log("Qatar is in the HTML!");
  } else {
    console.log("Qatar is NOT in the HTML!");
  }
  
  if (html.includes("0-1") || html.includes("0 - 1")) {
    console.log("Score 0-1 is in the HTML!");
  } else {
    console.log("Score 0-1 is NOT in the HTML!");
  }
}

checkHtml();
