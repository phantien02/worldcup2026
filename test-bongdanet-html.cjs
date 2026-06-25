const url = 'https://bongdanet.online/livescore';

async function checkHtml() {
  const res = await fetch(url);
  const html = await res.text();
  console.log("Length of HTML:", html.length);
  
  const qatarIndex = html.toLowerCase().indexOf('qatar');
  if (qatarIndex !== -1) {
    console.log("Qatar is in the HTML!");
    console.log("Context around Qatar:");
    console.log(html.substring(Math.max(0, qatarIndex - 100), qatarIndex + 200));
  } else {
    console.log("Qatar is NOT in the HTML!");
  }
}

checkHtml();
