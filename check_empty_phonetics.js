const fs = require('fs');
const words = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf-8'));

// Find all words with empty phonetics
const emptyPhonetics = words.filter(w => !w.phonetic || w.phonetic === '');
console.log('Words with empty phonetics:', emptyPhonetics.length);
console.log('\nAll words with empty phonetics:');
emptyPhonetics.forEach(w => {
  console.log(w.word + ' | ' + w.pos + ' | ' + w.meaning);
});
