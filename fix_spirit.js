const fs = require('fs');
const wordsPath = 'E:/Tina/自研背单词软件/words.json';
const words = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

// Fix spirit's phonetic (it's an array, should be a string)
const fixedWords = words.map(w => {
  if (w.word === 'spirit' && Array.isArray(w.phonetic)) {
    return { ...w, phonetic: '[ˈspɪrɪt]' };
  }
  return w;
});

fs.writeFileSync(wordsPath, JSON.stringify(fixedWords, null, 2), 'utf-8');
console.log('Fixed spirit phonetic');

// Verify
const verify = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));
const spirit = verify.find(w => w.word === 'spirit');
console.log('spirit phonetic now:', spirit.phonetic);

// Also check for any other non-string phonetics
const badPhonetics = verify.filter(w => typeof w.phonetic !== 'string');
console.log('Non-string phonetics remaining:', badPhonetics.length);
if (badPhonetics.length > 0) {
  badPhonetics.forEach(w => console.log('  -', w.word, ':', JSON.stringify(w.phonetic)));
}
