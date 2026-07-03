const fs = require('fs');
const data = require('./ocr_words_final.json');

// 补上编号1
if (!data.find(x => x.number === 1)) {
  data.push({ number: 1, word: 'ability' });
}
// 补上编号448
if (!data.find(x => x.number === 448)) {
  data.push({ number: 448, word: 'collocation' });
}
// 补上编号1144
if (!data.find(x => x.number === 1144)) {
  data.push({ number: 1144, word: 'our' });
}
// 补上编号1722
if (!data.find(x => x.number === 1722)) {
  data.push({ number: 1722, word: 'west' });
}

data.sort((a, b) => a.number - b.number);

const nums = new Set(data.map(x => x.number));
const missing = [];
for (let i = 1; i <= 1785; i++) {
  if (!nums.has(i)) missing.push(i);
}

console.log('最终词条数:', data.length);
console.log('1-1785缺失:', missing.length, '个');
console.log('缺失编号:', missing.length > 0 ? missing.join(', ') : '无');
console.log('第一个:', data[0].number, data[0].word);
console.log('最后一个:', data[data.length-1].number, data[data.length-1].word);

fs.writeFileSync('ocr_words_final.json', JSON.stringify(data, null, 2), 'utf8');
console.log('已保存: ocr_words_final.json (1785词)');
