const fs = require('fs');
const content = fs.readFileSync('../../brain/181cf735-deea-4d7f-9908-4ddb4ba70988/.system_generated/steps/773/content.md', 'utf8');

const regex = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;
const match = content.match(regex);

if (match) {
  fs.writeFileSync('znews_data.json', match[1]);
  console.log('Extracted to znews_data.json');
} else {
  console.log('No NEXT_DATA found');
  
  // Try to find ANY json-like structure
  const maybeJson = content.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/);
  if (maybeJson) {
      fs.writeFileSync('znews_data.json', maybeJson[1]);
      console.log('Extracted INITIAL_STATE');
  }
}
