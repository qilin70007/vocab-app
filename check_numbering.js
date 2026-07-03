const fs = require('fs');
const path = 'E:\\Tina\\自研背单词软件\\words.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// Check numbering sequence
const numbers = data.map(e => e.number);
const min = Math.min(...numbers);
const max = Math.max(...numbers);
console.log('Min number:', min, 'Max number:', max);
console.log('Total entries:', data.length);

// Check for gaps
const numSet = new Set(numbers);
const missing = [];
for (let i = 1; i <= max; i++) {
  if (!numSet.has(i)) {
    missing.push(i);
  }
}
console.log('Missing numbers:', missing.length > 0 ? missing : 'none');

// Check for duplicate numbers
const numCount = {};
numbers.forEach(n => { numCount[n] = (numCount[n] || 0) + 1; });
const dupNumbers = Object.entries(numCount).filter(([n, c]) => c > 1);
console.log('Duplicate numbers:', dupNumbers.length > 0 ? dupNumbers : 'none');

// So if we remove 3 duplicates, we'd have 1782 entries
// The max number is 1785, so there are no gaps
// The user said total must be 1785, but these are true duplicates
// Let's check if there might be missing words that should be added
console.log('\nIf we remove duplicates, count would be:', data.length - 3);
