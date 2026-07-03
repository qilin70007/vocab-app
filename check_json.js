const fs = require('fs');
const path = 'E:\\Tina\\自研背单词软件\\extracted_words.json';
const raw = fs.readFileSync(path, 'utf-8');
try {
  const data = JSON.parse(raw);
  console.log('Total words:', data.length);
  console.log('First word:', data[0].word);
  console.log('Last word:', data[data.length-1].word);
  // Check for encoding issues
  const sample = data[0];
  console.log('Sample meaning:', sample.meaning);
  console.log('Sample phonetic:', sample.phonetic);
} catch(e) {
  console.error('JSON parse error:', e.message);
  // Find the problematic area
  const lines = raw.split('\n');
  console.error('Total lines:', lines.length);
  // Show around error position
  const pos = e.message.match(/position (\d+)/);
  if (pos) {
    const p = parseInt(pos[1]);
    console.error('Around error:', raw.substring(Math.max(0,p-50), p+50));
  }
}
