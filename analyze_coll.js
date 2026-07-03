/**
 * 分析搭配chn为空的情况
 * 区分：数据错位 vs 中文翻译缺失
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

const misplaced = [];
const missingTrans = [];
const garbage = [];

for (const word of words) {
  if (!word.collocations) continue;
  const wordLower = word.word.toLowerCase();
  
  for (let i = 0; i < word.collocations.length; i++) {
    const coll = word.collocations[i];
    if (!coll || typeof coll !== 'object') continue;
    
    const eng = (coll.eng || '').trim();
    const chn = (coll.chn || '').trim();
    
    if (!chn && eng) {
      // 检查 eng 是否包含目标单词
      if (eng.toLowerCase().includes(wordLower)) {
        // 包含目标单词，只是缺中文翻译
        missingTrans.push({ word: word.word, eng: eng });
      } else if (/[\u4e00-\u9fa5]/.test(eng)) {
        // eng 中有中文，但拆分失败
        garbage.push({ word: word.word, eng: eng });
      } else if (/[A-Z]{3,}/.test(eng) || /\d{3,}/.test(eng)) {
        // 含大量大写字母或数字 → OCR残留
        garbage.push({ word: word.word, eng: eng });
      } else {
        // 不含目标单词 → 数据错位
        misplaced.push({ word: word.word, eng: eng });
      }
    }
  }
}

console.log('========== 搭配chn为空分析 ==========');
console.log(`缺中文翻译(含目标单词): ${missingTrans.length}`);
console.log(`数据错位(不含目标单词): ${misplaced.length}`);
console.log(`OCR残留/乱码: ${garbage.length}`);

console.log('\n--- 缺中文翻译(前20) ---');
missingTrans.slice(0, 20).forEach((c, i) => {
  console.log(`${i + 1}. [${c.word}] eng="${c.eng}"`);
});

console.log('\n--- 数据错位(前20) ---');
misplaced.slice(0, 20).forEach((c, i) => {
  console.log(`${i + 1}. [${c.word}] eng="${c.eng}"`);
});

console.log('\n--- OCR残留(前20) ---');
garbage.slice(0, 20).forEach((c, i) => {
  console.log(`${i + 1}. [${c.word}] eng="${c.eng}"`);
});

// 保存
fs.writeFileSync('E:\\Tina\\自研背单词软件\\coll_analysis.json', JSON.stringify({
  missingTrans, misplaced, garbage
}, null, 2), 'utf-8');
