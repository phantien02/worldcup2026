async function test() {
  const url = `https://timkiem.vnexpress.net/?q=hàn+quốc+ch+séc+world+cup+2026`;
  const res = await fetch(url);
  const text = await res.text();
  
  const links = text.match(/https?:\/\/vnexpress\.net\/the-thao\/world-cup-2026\/tran-dau\/\d+\/[^\/]+\/dien-bien/g);
  console.log("VNExpress Search Links:", links ? [...new Set(links)] : "None");
}
test();
