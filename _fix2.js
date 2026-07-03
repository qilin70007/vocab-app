const fs = require('fs');
const data = JSON.parse(fs.readFileSync('words.json', 'utf8'));

// Words are indexed by position, number field = word number
// The task says "462 drink" etc - let's find by word
const targets = ['drink', 'end', 'front', 'German', 'help', 'hope', 'interview', 'late', 'paint'];

for (const t of targets) {
  const matches = data.filter(w => w.word === t);
  for (const m of matches) {
    console.log(JSON.stringify({number: m.number, word: m.word, meaning: m.meaning, forms: m.forms}));
  }
}
