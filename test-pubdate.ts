import { config } from 'dotenv';
config({ path: '.env.local' });

async function checkDates() {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent('cape verde vs uruguay kết quả')}&hl=vi&gl=VN&ceid=VN:vi`;
  const response = await fetch(url);
  const xml = await response.text();
  
  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).slice(0, 15);
  
  for (const match of items) {
    const itemXml = match[1];
    const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    
    if (titleMatch) {
      console.log('Title:', titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, ''));
      if (descMatch) {
        console.log('Desc:', descMatch[1].replace(/<[^>]+>/g, '').replace(/<!\[CDATA\[|\]\]>/g, '').substring(0, 100));
      }
      console.log('---');
    }
  }
}

checkDates();
