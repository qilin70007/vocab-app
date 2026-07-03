const fs = require('fs');
const data = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf-8'));

const garbled = [];
const emptyColl = [];

for (const w of data) {
  if (!w.collocations || w.collocations.length === 0) {
    emptyColl.push(w.number);
    continue;
  }
  
  let hasGarbled = false;
  for (const c of w.collocations) {
    for (let i = 0; i < c.length; i++) {
      const code = c.charCodeAt(i);
      if ((code > 126 && code < 0x2018) || (code > 0x9fff && code < 0xff00)) {
        hasGarbled = true;
        break;
      }
    }
    if (hasGarbled) break;
  }
  
  if (hasGarbled) {
    garbled.push({
      num: w.number,
      word: w.word,
      pos: w.pos,
      meaning: w.meaning,
      collocations: w.collocations
    });
  }
}

console.log('Garbled collocations:', garbled.length);
console.log('Empty collocations:', emptyColl.length);
console.log('\n--- Garbled words ---');
garbled.forEach(g => {
  console.log(`${g.num}|${g.word}|${g.pos}|${g.meaning}`);
  g.collocations.forEach((c, i) => console.log(`  [${i}] ${c}`));
});

// Save for batch processing
fs.writeFileSync('E:/Tina/自研背单词软件/garbled_list.json', JSON.stringify(garbled, null, 2), 'utf-8');
console.log('\nSaved to garbled_list.json');
