// 最后一批修正
const fs = require('fs');
const words = require('E:/Tina/自研背单词软件/words.json');

const corrections = {
  344: 'work out',  // 不是 rubbish (是词组)
  414: 'desk',      // 不是 day (OCR误读为TAY)
};

let fixed = 0;
words.forEach(x => {
  if (corrections[x.number]) {
    const oldWord = x.word;
    x.word = corrections[x.number];
    console.log(`修正 ${x.number}: ${oldWord} → ${x.word}`);
    fixed++;
  }
});

console.log(`\n共修正 ${fixed} 个词`);

// 最终重复词检查
const wordCount = {};
words.forEach(x => {
  const w = x.word.toLowerCase();
  wordCount[w] = (wordCount[w] || 0) + 1;
});
const dupes = Object.entries(wordCount).filter(([w, c]) => c > 1);
console.log('\n最终重复词:', dupes.length === 0 ? '无' : dupes.map(([w,c]) => {
  const entries = words.filter(x=>x.word.toLowerCase()===w);
  return `${w}(${entries.map(x=>`${x.number}:${x.word}`).join(', ')})`;
}).join('; '));

// 验证编号连续性
const nums = words.map(x => x.number).sort((a,b) => a-b);
let gaps = [];
for (let i = 1; i <= 1785; i++) {
  if (!nums.includes(i)) gaps.push(i);
}
console.log('编号缺失:', gaps.length === 0 ? '无' : gaps.join(', '));
console.log('总词数:', words.length);

fs.writeFileSync('E:/Tina/自研背单词软件/words.json', JSON.stringify(words, null, 2), 'utf8');
console.log('已写入 words.json');
