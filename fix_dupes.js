const fs = require('fs');
const path = 'E:\\Tina\\自研背单词软件\\words.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// China #285 - differentiate: add "china" as "瓷器" meaning (porcelain)
// The collocations already mention "China 瓷器" so let's make #285 about the porcelain meaning
data[284].meaning = '中国；瓷器';
data[284].collocations = ['china clay 高岭土', 'bone china 骨瓷'];
data[284].examples = ['This cup is made of fine china. 这个杯子是用精细瓷器做的。'];

// May #967 - differentiate: "may" as modal verb (可以，可能)
// The example already uses "may" as modal verb: "You May lose your way..."
data[966].word = 'may';
data[966].phonetic = '[meɪ]';
data[966].pos = 'v.';
data[966].meaning = '可以，可能（情态动词）';
data[966].forms = [];
data[966].collocations = ['may as well 不妨', 'may have done 可能已经...'];
data[966].examples = ['You may lose your way if you walk alone in the mountains at night. 如果你晚上独自在山里走，可能会迷路。'];

// miss #995 - differentiate: "miss" as verb (想念，错过)
// The collocations mention "我好想你啊" which relates to "miss" as "想念"
data[994].pos = 'v.';
data[994].meaning = '想念；错过；丢失';
data[994].forms = ['missing adj. 缺失的', 'missed adj. 错过的'];
data[994].collocations = ['miss someone 想念某人', 'miss the bus 错过公交车', 'miss you! 我好想你啊!'];
data[994].examples = ['I miss you so much! 我好想你啊！', 'He missed the train by two minutes. 他差两分钟没赶上火车。'];

// Write back
fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
console.log('Done! File updated.');

// Verify
const verify = JSON.parse(fs.readFileSync(path, 'utf8'));
console.log('Total entries:', verify.length);
console.log('\nChina #284:', verify[283].word, '-', verify[283].meaning);
console.log('China #285:', verify[284].word, '-', verify[284].meaning);
console.log('\nMay #966:', verify[965].word, '-', verify[965].meaning);
console.log('May #967:', verify[966].word, '-', verify[966].meaning);
console.log('\nmiss #994:', verify[993].word, '-', verify[993].meaning);
console.log('miss #995:', verify[994].word, '-', verify[994].meaning);

// Verify no more true duplicates
const wordMap = {};
verify.forEach((e, i) => {
  const w = e.word.toLowerCase();
  if (!wordMap[w]) wordMap[w] = [];
  wordMap[w].push({index: i, number: e.number, word: e.word, meaning: e.meaning});
});
console.log('\n=== Remaining duplicate words ===');
Object.keys(wordMap).forEach(w => {
  if (wordMap[w].length > 1) {
    console.log('Duplicate word:', w);
    wordMap[w].forEach(e => console.log('  number=' + e.number + ', meaning=' + e.meaning));
  }
});
