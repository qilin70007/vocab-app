const fs = require('fs');
const path = 'E:\\Tina\\自研背单词软件\\words.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
console.log('Total entries:', data.length);
console.log('Keys:', Object.keys(data[0]));

console.log('\n=== Entries 283-286 ===');
data.filter(e => [283,284,285,286].includes(e.number)).forEach(e => {
  console.log('number=' + e.number + ', word=' + e.word);
});

console.log('\n=== Entries 965-968 ===');
data.filter(e => [965,966,967,968].includes(e.number)).forEach(e => {
  console.log('number=' + e.number + ', word=' + e.word);
});

console.log('\n=== Entries 993-996 ===');
data.filter(e => [993,994,995,996].includes(e.number)).forEach(e => {
  console.log('number=' + e.number + ', word=' + e.word);
});

// Also find all duplicate words
console.log('\n=== All duplicate words ===');
const wordMap = {};
data.forEach((e, i) => {
  const w = e.word.toLowerCase();
  if (!wordMap[w]) wordMap[w] = [];
  wordMap[w].push({index: i, number: e.number, word: e.word});
});
Object.keys(wordMap).forEach(w => {
  if (wordMap[w].length > 1) {
    console.log('Duplicate:', JSON.stringify(wordMap[w]));
  }
});
