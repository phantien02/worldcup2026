const fs = require('fs');
const path = require('path');

const musicDir = path.join(__dirname, 'public', 'music');
const webmFiles = fs.readdirSync(musicDir).filter(f => f.endsWith('.webm'));
webmFiles.forEach(f => fs.unlinkSync(path.join(musicDir, f)));

const files = fs.readdirSync(musicDir).filter(f => f.endsWith('.m4a'));

const songs = files.map(file => {
  let cleanName = file.replace(/^\d+_-_/, '')
                      .replace(/\.m4a$/, '')
                      .replace(/ \(FIFA World Cup 2026™\)/g, '')
                      .replace(/ \[Official Music Video\]/g, '')
                      .replace(/ \[Official Lyric Video\]/g, '');
  
  cleanName = cleanName.replace(/™/g, '');
  
  const parts = cleanName.split(' - ');
  let artist = parts.length > 1 ? parts[0].replace(/, FIFA Sound/g, '').trim() : "FIFA Sound";
  let title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : cleanName;

  return {
    title: title,
    artist: artist,
    url: "/music/" + encodeURIComponent(file).replace(/%2F/g, '/')
  };
});

let content = fs.readFileSync('src/components/BackgroundMusic.tsx', 'utf8');

const newSongsCode = `const SONGS = ${JSON.stringify(songs, null, 2)};`;
content = content.replace(/const SONGS = \[[\s\S]*?\];/, newSongsCode);

fs.writeFileSync('src/components/BackgroundMusic.tsx', content);
console.log('Successfully updated BackgroundMusic.tsx with ' + songs.length + ' songs.');
