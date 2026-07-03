const fs = require('fs');
const path = 'E:\\Tina\\自研背单词软件\\words.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// Final verification
console.log('=== Final Verification ===');
console.log('Total entries:', data.length);

// Check China
const c284 = data.find(e => e.number === 284);
const c285 = data.find(e => e.number === 285);
console.log('\n[China] #284:', JSON.stringify(c284, null, 2));
console.log('\n[China] #285:', JSON.stringify(c285, null, 2));

// Check May
const m966 = data.find(e => e.number === 966);
const m967 = data.find(e => e.number === 967);
console.log('\n[May] #966:', JSON.stringify(m966, null, 2));
console.log('\n[may] #967:', JSON.stringify(m967, null, 2));

// Check miss
const miss994 = data.find(e => e.number === 994);
const miss995 = data.find(e => e.number === 995);
console.log('\n[miss] #994:', JSON.stringify(miss994, null, 2));
console.log('\n[miss] #995:', JSON.stringify(miss995, null, 2));

// Verify numbering is still 1 to 1785 with no gaps
const numbers = data.map(e => e.number).sort((a,b)=>a-b);
let isSequential = true;
for (let i = 0; i < numbers.length; i++) {
  if (numbers[i] !== i + 1) { isSequential = false; console.log('Gap at', i+1, 'expected, found', numbers[i]); }
}
console.log('\nNumbering is sequential 1-1785 with no gaps:', isSequential);

// Check number field values are unique
const numSet = new Set(numbers);
console.log('Number field unique count:', numSet.size, '(should be', data.length, ')');
