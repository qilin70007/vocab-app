/**
 * 深度分析搭配问题
 * 模式：英文单词+中文翻译 黏在一起
 * 例："afford支付得起做某事" → "afford to do sth. 支付得起做某事"
 */

const fs = require('fs');
const words = JSON.parse(fs.readFileSync('E:\\Tina\\自研背单词软件\\words.json', 'utf-8'));

// 收集所有"单词+中文"格式的搭配
const samples = [];
for (const w of words) {
  if (!w.collocations) continue;
  for (let i = 0; i < w.collocations.length; i++) {
    const c = w.collocations[i];
    if (typeof c !== 'string') continue;
    if (c.toLowerCase().startsWith(w.word.toLowerCase())) {
      const after = c.substring(w.word.length);
      if (/[\u4e00-\u9fa5]/.test(after)) {
        samples.push({ word: w.word, current: c });
      }
    }
  }
}

console.log('问题搭配样本(前50):');
samples.slice(0, 50).forEach((s, i) => {
  console.log((i + 1) + '. [' + s.word + '] "' + s.current + '"');
});

console.log('\n\n按长度分布:');
const lenStats = {};
for (const s of samples) {
  const chinese = s.current.match(/[\u4e00-\u9fa5].*$/);
  if (chinese) {
    const len = chinese[0].length;
    lenStats[len] = (lenStats[len] || 0) + 1;
  }
}
const sorted = Object.keys(lenStats).map(Number).sort((a, b) => a - b);
sorted.forEach(len => {
  console.log('中文长度 ' + len + ': ' + lenStats[len] + ' 个');
});
