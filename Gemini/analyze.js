const o = require('../ocr_parsed_words.json');
const w = require('../words.json');

const nums = new Set(o.map(x => x.number));
const missing = [];
for (let i = 1; i <= 101; i++) {
  if (!nums.has(i)) missing.push(i);
}
console.log('OCR missing number 1-101:', missing.length);
console.log(missing.join(','));
console.log('---');

console.log('OCR last 20 words:');
o.slice(-20).forEach(x => console.log(x.number, x.word));
console.log('---');

// Check OCR words with quality issues
let badDef = o.filter(x => !x.definition || x.definition.trim().length < 2);
let badPhonetic = o.filter(x => !x.phonetic || x.phonetic.trim().length < 2);
let badExamples = o.filter(x => !x.examples || x.examples.length === 0);
console.log('OCR words with empty/bad definition:', badDef.length);
console.log('OCR words with empty/bad phonetic:', badPhonetic.length);
console.log('OCR words with no examples:', badExamples.length);
console.log('---');

// Check words.json for quality
let wBadDef = w.filter(x => !x.meaning || x.meaning.trim().length < 2);
let wBadPhonetic = w.filter(x => !x.phonetic || x.phonetic.trim().length < 2);
console.log('words.json with empty/bad meaning:', wBadDef.length);
console.log('words.json with empty/bad phonetic:', wBadPhonetic.length);
console.log('---');

// Look at some of the 632 words in words.json but not in OCR
const oSet = new Set(o.map(x => x.word.toLowerCase()));
const extra = w.filter(x => !oSet.has(x.word.toLowerCase()));
console.log('words.json has but OCR doesnt:', extra.length);
console.log('First 50:', extra.slice(0, 50).map(x => x.word).join(', '));
console.log('---');

// Check sources in words.json
const sources = {};
w.forEach(x => { sources[x.source || 'unknown'] = (sources[x.source || 'unknown'] || 0) + 1; });
console.log('words.json sources:', JSON.stringify(sources));
