// Extract all word numbers and their hand-written examples from fill_examples.js
const fs = require('fs');
const text = fs.readFileSync('E:/Tina/自研背单词软件/fill_examples.js', 'utf8');

// Parse E[number]=['...'] patterns
const regex = /E\[(\d+)\]=\[(.+?)\];/g;
let match;
const results = [];
while ((match = regex.exec(text)) !== null) {
    const num = parseInt(match[1]);
    const exampleStr = match[2];
    // Extract the English part (before the Chinese)
    const examples = [];
    // Split by ', ' but be careful with quotes
    const exRegex = /'([^']+)'/g;
    let m2;
    while ((m2 = exRegex.exec(exampleStr)) !== null) {
        examples.push(m2[1]);
    }
    results.push({ number: num, examples });
}

// Load words.json to get word names
const words = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf8'));
const wordMap = new Map();
for (const w of words) wordMap.set(w.number, w);

console.log(`Total hand-filled examples: ${results.length}`);
console.log('');
for (const r of results) {
    const w = wordMap.get(r.number);
    const word = w ? w.word : 'UNKNOWN';
    const engExample = r.examples[0] ? r.examples[0].split('.')[0] + '.' : '';
    console.log(`#${r.number} ${word}: ${r.examples[0] || 'empty'}`);
}

// Save to file
fs.writeFileSync('E:/Tina/自研背单词软件/hand_filled_examples.json', JSON.stringify(results, null, 2));
console.log(`\nSaved to hand_filled_examples.json`);
