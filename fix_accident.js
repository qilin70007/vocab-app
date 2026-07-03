const fs = require('fs');
const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

const word = words.find(x => x.word === 'accident');
if (word) {
  // 修正搭配：根据第二张图，正确的搭配是 "by accident 偶然地"
  // 当前错误数据：
  //   "accidentt  车祸"     → 删掉
  //   "accidentt  偶然；意外地" → 改为 "by accident 偶然地"
  word.collocations = ['by accident 偶然地'];
  console.log('已修正 accident 搭配:');
  console.log('  原: "accidentt  车祸"');
  console.log('  原: "accidentt  偶然；意外地"');
  console.log('  新: "by accident 偶然地"');
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');
console.log('\n已保存');
