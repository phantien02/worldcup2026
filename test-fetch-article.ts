import { config } from 'dotenv';
config({ path: '.env.local' });

async function testFetch() {
  const url = 'https://news.google.com/rss/articles/CBMitgFBVV95cUxPNTNfc193S1FOdER1bnN5bC0tdThsblpsQnpRdkpXSE9pOG04aExZOG44dkp3MEtyeEtmVlBYWl9qNEF0dURPcjBqNUpUazk4X19vMjVBSWcwTUZRSTJjSVB4TE00bk9LMFQ4RWxyc09oOUhOSzQ0eWk4WDFaN1Z1S051UE05OWZpTVF6c1NlUzdEaGlrZ3c1X1VwQU9uSktrd0tSRUlyZ1lBdzZzSmJzZlBEWEE?oc=5';
  console.log('Fetching:', url);
  try {
    const response = await fetch(url, { redirect: 'follow' });
    const text = await response.text();
    console.log('Response URL:', response.url);
    console.log('Content snippet:', text.substring(0, 500));
  } catch (err) {
    console.error(err);
  }
}

testFetch();
