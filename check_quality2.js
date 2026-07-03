const fs = require('fs');
const w = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf-8'));

let garbledMeaning = 0;
let needFix = 0;

w.forEach(x => {
  let issues = false;
  if (x.meaning && x.meaning.includes('___')) { garbledMeaning++; issues = true; }
  if (!x.phonetic || x.phonetic.startsWith("'")) issues = true;
  if (x.collocations && x.collocations.some(c => c.eng && c.eng.includes('___'))) issues = true;
  if (!x.forms || !x.forms.length) issues = true;
  if (!x.collocations || !x.collocations.length) issues = true;
  if (!x.examples || !x.examples.length) issues = true;
  if (issues) needFix++;
});

console.log('Garbled meanings (with ___):', garbledMeaning);
console.log('Words needing at least one fix:', needFix, '/', w.length);
console.log('Words fully complete:', w.length - needFix, '/', w.length);

// Check how many words have all 6 fields properly filled
let complete = 0;
w.forEach(x => {
  if (x.phonetic && x.phonetic.startsWith('[') &&
      x.forms && x.forms.length > 0 &&
      x.collocations && x.collocations.length > 0 &&
      x.collocations.every(c => !c.eng || !c.eng.includes('___')) &&
      x.examples && x.examples.length > 0 &&
      x.meaning && !x.meaning.includes('___')) {
    complete++;
  }
});
console.log('Fully complete & clean words:', complete, '/', w.length);
