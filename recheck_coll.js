/**
 * 重新审计搭配问题
 */

const fs = require('fs');
const words = JSON.parse(fs.readFileSync('E:\\Tina\\自研背单词软件\\words.json', 'utf-8'));

const issues = [];

for (const w of words) {
  if (!w.collocations) continue;
  for (let i = 0; i < w.collocations.length; i++) {
    const c = w.collocations[i];
    if (typeof c !== 'string') continue;
    
    // 检查是否以单词+中文开头（无空格）
    if (c.toLowerCase().startsWith(w.word.toLowerCase())) {
      const after = c.substring(w.word.length);
      if (/^[\u4e00-\u9fa5]/.test(after)) {
        issues.push({ word: w.word, index: i, current: c, type: 'word_stuck_chinese' });
      }
    }
    
    // 检查单词重复
    if (new RegExp('^' + w.word + w.word, 'i').test(c)) {
      issues.push({ word: w.word, index: i, current: c, type: 'word_dup' });
    }
    
    // 检查页码
    if (/\d+\s*of\s*\d+/.test(c)) {
      issues.push({ word: w.word, index: i, current: c, type: 'page_num' });
    }
  }
}

console.log('剩余问题: ' + issues.length);
issues.slice(0, 30).forEach((issue, i) => {
  console.log((i + 1) + '. [' + issue.word + '][' + issue.index + '] ' + issue.type);
  console.log('   ' + issue.current);
});
