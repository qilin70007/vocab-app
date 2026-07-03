/**
 * 清理错位和OCR残留的搭配
 * 删除 chn为空 且 eng不含目标单词 且 eng不含中文 的搭配
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let removed = 0;
const fixes = [];

for (const word of words) {
  if (!word.collocations) continue;
  const wordLower = word.word.toLowerCase();
  
  for (let i = word.collocations.length - 1; i >= 0; i--) {
    const coll = word.collocations[i];
    if (!coll || typeof coll !== 'object') continue;
    
    const eng = (coll.eng || '').trim();
    const chn = (coll.chn || '').trim();
    
    if (!chn && eng) {
      // 不含目标单词
      if (!eng.toLowerCase().includes(wordLower)) {
        // 数据错位或OCR残留 → 删除
        removed++;
        fixes.push({ word: word.word, eng: eng });
        word.collocations.splice(i, 1);
      } else if (/[A-Z]{3,}/.test(eng) || /\d{3,}/.test(eng)) {
        // 含目标单词但OCR残留严重 → 删除
        removed++;
        fixes.push({ word: word.word, eng: eng });
        word.collocations.splice(i, 1);
      }
    }
    
    // 删除 eng 为空的搭配
    if (!eng && !chn) {
      word.collocations.splice(i, 1);
      removed++;
    }
  }
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');

console.log(`搭配删除: ${removed} 个`);
console.log('\n删除样本(前30):');
fixes.slice(0, 30).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}] eng="${f.eng}"`);
});
