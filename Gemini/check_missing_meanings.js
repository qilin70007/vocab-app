const fs = require('fs');
const result = require('../words.json');
const oldWords = require('../words_backup_1908.json');

const oldSet = new Set(oldWords.map(x => x.word.toLowerCase()));
const noMeaning = result.filter(x => !x.meaning || x.meaning.trim().length === 0);

// 检查这些词是否有拼写问题
console.log('无释义的词分析:');
noMeaning.forEach(x => {
  const w = x.word.toLowerCase();
  const inOld = oldSet.has(w);
  // 看看旧词库里有没有类似的词
  let similar = oldWords.filter(ow => {
    const oword = ow.word.toLowerCase();
    // 编辑距离简单的判断：长度差不超过2，且有公共子串
    if (Math.abs(oword.length - w.length) > 2) return false;
    // 检查前缀匹配
    const prefix = w.substring(0, Math.min(3, w.length));
    return oword.startsWith(prefix) && oword !== w;
  }).map(ow => ow.word);
  
  console.log(`  ${x.number}. ${x.word} (旧库${inOld ? '有' : '无'})${similar.length > 0 ? ' 类似: ' + similar.slice(0, 3).join(', ') : ''}`);
});
