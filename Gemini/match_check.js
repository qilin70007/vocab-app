const o = require('../ocr_parsed_words.json');
const w = require('../words.json');

// 从words.json建索引
const wMap = {};
w.forEach(x => { wMap[x.word.toLowerCase()] = x; });

// 匹配
let matched = 0;
let unmatched = 0;
let unmatchedWords = [];

o.forEach(item => {
  const key = item.word.toLowerCase();
  if (wMap[key]) {
    matched++;
  } else {
    unmatched++;
    unmatchedWords.push(item.word);
  }
});

console.log('OCR 1279词 vs words.json 匹配:');
console.log('  匹配到释义:', matched);
console.log('  未匹配:', unmatched);
console.log('  未匹配的词:', unmatchedWords.join(', '));
