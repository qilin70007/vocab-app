const words = require('E:/Tina/自研背单词软件/words.json');

// 找出重复词的编号
const wordToNums = {};
words.forEach(x => {
  const w = x.word.toLowerCase();
  if (!wordToNums[w]) wordToNums[w] = [];
  wordToNums[w].push(x.number);
});

const dupes = Object.entries(wordToNums).filter(([w, nums]) => nums.length > 1);
console.log('重复词及编号:');
dupes.forEach(([w, nums]) => {
  console.log(`  ${w}: ${nums.join(', ')}`);
});
