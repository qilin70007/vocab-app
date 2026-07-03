// 应用所有从OCR文本确认的修正（第四批）
const fs = require('fs');
const words = require('E:/Tina/自研背单词软件/words.json');

const corrections = {
  494: 'else',         // 不是 encourage
  744: 'hero',         // 不是 wild
  839: 'Japan',        // 不是 information
  893: 'lecture',      // 不是 job
  894: 'left',         // 不是 join
  934: 'love',         // 不是 leave
  1149: 'performance', // 不是 owner
  1252: 'public',      // 不是 present
  1294: 'regular',     // 不是 reason
  1379: 'seat',        // 不是 safety
  1454: 'smoke',       // 不是 sign
  1494: 'start',       // 不是 sound
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

// 同时处理这些修正后的释义、音标等字段
// 需要从OCR文本提取正确的释义信息
// 先看看重复词情况
const wordCount = {};
words.forEach(x => {
  const w = x.word.toLowerCase();
  wordCount[w] = (wordCount[w] || 0) + 1;
});
const dupes = Object.entries(wordCount).filter(([w, c]) => c > 1);
console.log('\n剩余重复词:', dupes.length === 0 ? '无' : dupes.map(([w,c]) => {
  const nums = words.filter(x=>x.word.toLowerCase()===w).map(x=>x.number);
  return `${w}(${nums.join(',')})`;
}).join('; '));

fs.writeFileSync('E:/Tina/自研背单词软件/words.json', JSON.stringify(words, null, 2), 'utf8');
console.log('已写入 words.json');
