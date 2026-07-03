/**
 * 扫描例句中的小写问题
 * 1. "i" 单独成词应改为 "I"
 * 2. "i'm" 应改为 "I'm"
 * 3. 句首小写
 */

const fs = require('fs');
const words = JSON.parse(fs.readFileSync('E:\\Tina\\自研背单词软件\\words.json', 'utf-8'));

const issues = [];

for (const w of words) {
  if (!w.examples) continue;
  for (let i = 0; i < w.examples.length; i++) {
    const ex = w.examples[i];
    if (typeof ex !== 'string') continue;
    
    // 提取英文部分
    const engMatch = ex.match(/^([A-Za-z][^.!?]*[.!?]?)/);
    if (!engMatch) continue;
    const eng = engMatch[1];
    
    // 检查单独的 " i " (前后是空格或标点)
    if (/\b i \b/.test(eng) || /\bi\b/.test(eng.replace(/^[Ii] /, ''))) {
      // 排除 "I" 已经是大写的情况
      if (/\b i \b/.test(eng) || /\bi'/.test(eng) || /\bi\b/.test(eng.replace(/^[Ii] /, ''))) {
        issues.push({ word: w.word, index: i, current: ex, type: 'lowercase_i' });
      }
    }
  }
}

console.log('找到 ' + issues.length + ' 个例句小写问题\n');
issues.slice(0, 30).forEach((issue, i) => {
  console.log((i + 1) + '. [' + issue.word + '] ex[' + issue.index + ']');
  console.log('   ' + issue.current.substring(0, 100));
});
