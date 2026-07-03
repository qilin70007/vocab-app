const fs = require('fs');
const words = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf-8'));

// Find the 18 words with meaning issues
const badMeaning = words.filter(w => {
  const m = String(w.meaning || '');
  return !m || m.includes('___') || m.includes('  ');
});
console.log('=== Words with meaning issues (' + badMeaning.length + ') ===');
badMeaning.forEach(w => {
  console.log(w.word + ': "' + w.meaning + '"');
});

// Check words with extra spaces or weird patterns in meaning
console.log('\n=== Words with double-space in meaning ===');
words.filter(w => String(w.meaning || '').includes('  ')).forEach(w => {
  console.log(w.word + ': "' + w.meaning + '"');
});
