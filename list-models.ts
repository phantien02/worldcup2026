import { config } from 'dotenv';
config({ path: '.env.local' });
const apiKey = process.env.GEMINI_API_KEY?.trim();

async function run() {
  let models: string[] = [];
  let pageToken = '';
  do {
    const url = pageToken ? `https://generativelanguage.googleapis.com/v1beta/models?pageToken=\${pageToken}` : 'https://generativelanguage.googleapis.com/v1beta/models';
    const res = await fetch(url, {
      headers: { 'x-goog-api-key': apiKey || '' }
    });
    const data = await res.json();
    if (data.models) models.push(...data.models.map((m: any) => m.name));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  console.log(models);
}
run();
