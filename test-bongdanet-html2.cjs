const url = 'https://bongdanet.online/livescore';

async function checkHtml() {
  const res = await fetch(url);
  const html = await res.text();
  
  const targetIndex = html.toLowerCase().indexOf('thụy s');
  if (targetIndex !== -1) {
    console.log("Thuy Si is in the HTML!");
    console.log("Context:");
    console.log(html.substring(Math.max(0, targetIndex - 200), targetIndex + 300));
  } else {
    console.log("Thuy Si is NOT in the HTML!");
  }
}

checkHtml();
