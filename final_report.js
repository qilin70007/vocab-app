const fs = require('fs');
const wordsPath = 'E:/Tina/自研背单词软件/words.json';
const words = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

// Replace double spaces with single space in all meanings
let fixCount = 0;
const fixedWords = words.map(w => {
  if (w.meaning && w.meaning.includes('  ')) {
    fixCount++;
    return { ...w, meaning: w.meaning.replace(/  +/g, ' ') };
  }
  return w;
});

console.log('Double-space cleaned:', fixCount);
fs.writeFileSync(wordsPath, JSON.stringify(fixedWords, null, 2), 'utf-8');

// Final verify
const verify = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));
const badCount = verify.filter(w => {
  const m = String(w.meaning || '');
  return !m || m.includes('___') || m.includes('  ');
}).length;
console.log('Remaining bad meanings:', badCount);

// Final quality report
let stats = { total: verify.length, phOK: 0, forms: 0, coll: 0, ex: 0, meaningClean: 0, complete: 0 };
verify.forEach(w => {
  const ph = String(w.phonetic || '');
  if (ph.startsWith('[')) stats.phOK++;
  if (w.forms && w.forms.length) stats.forms++;
  if (w.collocations && w.collocations.length) stats.coll++;
  if (w.examples && w.examples.length) stats.ex++;
  const m = String(w.meaning || '');
  if (m && !m.includes('___') && !m.includes('  ')) stats.meaningClean++;
  if (ph.startsWith('[') && w.forms && w.forms.length && w.collocations && w.collocations.length && w.examples && w.examples.length && m && !m.includes('___') && !m.includes('  ')) stats.complete++;
});
const pct = n => (n / stats.total * 100).toFixed(1) + '%';
console.log('\n=== Final Quality Report ===');
console.log('Phonetic OK:', pct(stats.phOK), `(${stats.phOK}/${stats.total})`);
console.log('Forms present:', pct(stats.forms), `(${stats.forms}/${stats.total})`);
console.log('Collocations present:', pct(stats.coll), `(${stats.coll}/${stats.total})`);
console.log('Examples present:', pct(stats.ex), `(${stats.ex}/${stats.total})`);
console.log('Meaning clean:', pct(stats.meaningClean), `(${stats.meaningClean}/${stats.total})`);
console.log('Fully complete (all 5 fields):', pct(stats.complete), `(${stats.complete}/${stats.total})`);
