// 应用新确认的修正
const fs = require('fs');
const words = require('E:/Tina/自研背单词软件/words.json');

const corrections = {
  40: 'aim',        // 不是 there (OCR page_0016确认)
  48: 'almost',     // 不是 out (OCR page_0017确认)
  1722: 'weight',   // 不是 west (OCR page_0256确认)
};

// 编号 744 实际不存在，是 1744 的误读
// 但我们需要保留 744 号位置——需要看 PDF 确认 744 实际是什么词

// 编号 842 确实是 job，但 893 也被标为 job（OCR未找到）
// 编号 843 确实是 join，但 894 也被标为 join（OCR未找到）
// 这些 893/894 等编号需要看PDF图片

let fixed = 0;
words.forEach(x => {
  if (corrections[x.number]) {
    const oldWord = x.word;
    x.word = corrections[x.number];
    console.log(`修正 ${x.number}: ${oldWord} → ${x.word}`);
    fixed++;
  }
});

console.log(`共修正 ${fixed} 个词`);

// 检查重复
const wordCount = {};
words.forEach(x => {
  const w = x.word.toLowerCase();
  wordCount[w] = (wordCount[w] || 0) + 1;
});
const dupes = Object.entries(wordCount).filter(([w, c]) => c > 1);
console.log('\n剩余重复词:', dupes.length === 0 ? '无' : dupes.map(([w,c]) => `${w}: ${words.filter(x=>x.word.toLowerCase()===w).map(x=>x.number).join(',')}`).join('; '));

fs.writeFileSync('E:/Tina/自研背单词软件/words.json', JSON.stringify(words, null, 2), 'utf8');
console.log('已写入 words.json');
