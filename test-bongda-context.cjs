const url = 'https://bong-da.com/the-gioi/world-cup/livescore';

async function checkHtml() {
  const res = await fetch(url);
  const html = await res.text();
  
  const qatarIndex = html.indexOf('Qatar');
  if (qatarIndex !== -1) {
    console.log("Context around Qatar:");
    console.log(html.substring(Math.max(0, qatarIndex - 100), qatarIndex + 200));
  }
}

checkHtml();
