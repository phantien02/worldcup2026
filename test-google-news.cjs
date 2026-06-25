require('dotenv').config({ path: '.env.local' });

// Test Google News search for match results (article snippets, not sports widget)
async function testGoogleNews() {
  // Google News RSS is often accessible to bots
  const queries = [
    'https://news.google.com/rss/search?q=Qatar+Th%E1%BB%A5y+S%C4%A9+World+Cup+2026+k%E1%BA%BFt+qu%E1%BA%A3&hl=vi&gl=VN&ceid=VN:vi',
    'https://news.google.com/rss/search?q=Qatar+Switzerland+World+Cup+2026+result&hl=en',
  ];

  for (const url of queries) {
    console.log('\nFetching:', url.substring(0, 80) + '...');
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      console.log('Status:', res.status);
      const text = await res.text();
      console.log('Length:', text.length);
      
      if (text.includes('Qatar')) {
        console.log('✅ Found Qatar!');
        // Extract titles from RSS
        const titles = [...text.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)];
        console.log('Article titles:');
        titles.slice(0, 10).forEach(t => console.log(' -', t[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()));
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
}

testGoogleNews();
