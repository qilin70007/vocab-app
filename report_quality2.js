const fs = require('fs');
const words = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf-8'));

let stats = {
  total: words.length,
  phoneticOK: 0,
  phoneticEmpty: 0,
  phoneticOld: 0,
  formsPresent: 0,
  formsEmpty: 0,
  collocationsPresent: 0,
  collocationsEmpty: 0,
  examplesPresent: 0,
  examplesEmpty: 0,
  meaningClean: 0,
  meaningHasGarbage: 0,
  fullyComplete: 0,
};

words.forEach(w => {
  const ph = String(w.phonetic || '');
  if (!ph || ph === '') stats.phoneticEmpty++;
  else if (ph.startsWith('[')) stats.phoneticOK++;
  else stats.phoneticOld++;
  
  if (w.forms && w.forms.length > 0) stats.formsPresent++;
  else stats.formsEmpty++;
  
  if (w.collocations && w.collocations.length > 0) stats.collocationsPresent++;
  else stats.collocationsEmpty++;
  
  if (w.examples && w.examples.length > 0) stats.examplesPresent++;
  else stats.examplesEmpty++;
  
  const m = String(w.meaning || '');
  if (m && !m.includes('___') && !m.includes('  ')) stats.meaningClean++;
  else stats.meaningHasGarbage++;
  
  if (ph && ph.startsWith('[') &&
      w.forms && w.forms.length > 0 &&
      w.collocations && w.collocations.length > 0 &&
      w.examples && w.examples.length > 0 &&
      m && !m.includes('___') && !m.includes('  ')) {
    stats.fullyComplete++;
  }
});

const pct = (n) => (n / stats.total * 100).toFixed(1) + '%';
console.log('=== Data Quality Report ===');
console.log(`Total words: ${stats.total}`);
console.log(`Phonetic OK: ${pct(stats.phoneticOK)} (${stats.phoneticOK})`);
console.log(`Phonetic empty: ${stats.phoneticEmpty}`);
console.log(`Phonetic old format: ${stats.phoneticOld}`);
console.log(`Forms present: ${pct(stats.formsPresent)} (${stats.formsPresent})`);
console.log(`Collocations present: ${pct(stats.collocationsPresent)} (${stats.collocationsPresent})`);
console.log(`Examples present: ${pct(stats.examplesPresent)} (${stats.examplesPresent})`);
console.log(`Meaning clean: ${pct(stats.meaningClean)} (${stats.meaningClean})`);
console.log(`Fully complete: ${pct(stats.fullyComplete)} (${stats.fullyComplete})`);

// Check for the 'spirit' word which had a wrong phonetic format
const spirit = words.find(w => w.word === 'spirit');
if (spirit) console.log('\nspirit phonetic:', JSON.stringify(spirit.phonetic));
