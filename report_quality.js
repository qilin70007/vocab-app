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
  // Phonetic
  if (!w.phonetic || w.phonetic === '') stats.phoneticEmpty++;
  else if (w.phonetic.startsWith('[')) stats.phoneticOK++;
  else stats.phoneticOld++;
  
  // Forms
  if (w.forms && w.forms.length > 0) stats.formsPresent++;
  else stats.formsEmpty++;
  
  // Collocations
  if (w.collocations && w.collocations.length > 0) stats.collocationsPresent++;
  else stats.collocationsEmpty++;
  
  // Examples
  if (w.examples && w.examples.length > 0) stats.examplesPresent++;
  else stats.examplesEmpty++;
  
  // Meaning clean
  if (w.meaning && !w.meaning.includes('___') && !w.meaning.includes('  ')) stats.meaningClean++;
  else stats.meaningHasGarbage++;
  
  // Fully complete
  if (w.phonetic && w.phonetic.startsWith('[') &&
      w.forms && w.forms.length > 0 &&
      w.collocations && w.collocations.length > 0 &&
      w.examples && w.examples.length > 0 &&
      w.meaning && !w.meaning.includes('___') && !w.meaning.includes('  ')) {
    stats.fullyComplete++;
  }
});

console.log('=== Data Quality Report After Fixes ===');
console.log(JSON.stringify(stats, null, 2));

// Show improvement percentages
const pct = (n) => (n / stats.total * 100).toFixed(1) + '%';
console.log('\n=== Summary ===');
console.log(`Phonetic OK: ${pct(stats.phoneticOK)} (${stats.phoneticOK}/${stats.total})`);
console.log(`Forms present: ${pct(stats.formsPresent)} (${stats.formsPresent}/${stats.total})`);
console.log(`Collocations present: ${pct(stats.collocationsPresent)} (${stats.collocationsPresent}/${stats.total})`);
console.log(`Examples present: ${pct(stats.examplesPresent)} (${stats.examplesPresent}/${stats.total})`);
console.log(`Meaning clean: ${pct(stats.meaningClean)} (${stats.meaningClean}/${stats.total})`);
console.log(`Fully complete: ${pct(stats.fullyComplete)} (${stats.fullyComplete}/${stats.total})`);

// Sample fully complete words
console.log('\nSample fully complete words:');
let count = 0;
words.forEach(w => {
  if (w.phonetic && w.phonetic.startsWith('[') &&
      w.forms && w.forms.length > 0 &&
      w.collocations && w.collocations.length > 0 &&
      w.examples && w.examples.length > 0 &&
      w.meaning && !w.meaning.includes('___') && !w.meaning.includes('  ')) {
    if (count < 3) {
      console.log(JSON.stringify(w, null, 2));
      count++;
    }
  }
});
