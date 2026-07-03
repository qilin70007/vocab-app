/**
 * 清理搭配中的单词重复和残留
 * 只处理已经拆分过（chn有值）的搭配
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let cleaned = 0;
const fixes = [];

for (const word of words) {
  if (!word.collocations) continue;
  
  const wordLower = word.word.toLowerCase();
  
  for (let i = 0; i < word.collocations.length; i++) {
    const coll = word.collocations[i];
    if (!coll || typeof coll !== 'object') continue;
    
    const eng = (coll.eng || '').trim();
    const chn = (coll.chn || '').trim();
    
    if (!eng || !chn) continue;
    
    const engLower = eng.toLowerCase();
    
    // "adultadult" → "adult"
    if (engLower === wordLower + wordLower) {
      coll.eng = word.word;
      cleaned++;
      fixes.push({ word: word.word, type: 'dup', old: eng, new: word.word });
      continue;
    }
    
    // "accidentt" → "accident" (word + 1-2 char garbage suffix)
    if (engLower.startsWith(wordLower) && engLower.length > wordLower.length) {
      const remainder = engLower.substring(wordLower.length);
      if (remainder.length <= 2) {
        coll.eng = word.word;
        cleaned++;
        fixes.push({ word: word.word, type: 'suffix', old: eng, new: word.word });
      }
    }
    
    // 清理 chn 中尾部的英文单词重复
    // 如 "缺席  absent出席" → 拆成两个搭配比较麻烦，先清理
    // 如 "意见 一致  agree" 中的尾部 agree → 已在拆分时处理
    
    // 清理 eng 中的 "-- X of 90 --" 页码残留
    if (coll.eng && /--\s*\d+\s*of\s*\d+\s*--/.test(coll.eng)) {
      const old = coll.eng;
      coll.eng = coll.eng.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim();
      cleaned++;
      fixes.push({ word: word.word, type: 'page_ref', old: old, new: coll.eng });
    }
    
    if (coll.chn && /--\s*\d+\s*of\s*\d+\s*--/.test(coll.chn)) {
      const old = coll.chn;
      coll.chn = coll.chn.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim();
      cleaned++;
      fixes.push({ word: word.word, type: 'page_ref_chn', old: old, new: coll.chn });
    }
  }
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');

console.log(`搭配清理: ${cleaned} 个`);
console.log('\n修复样本:');
fixes.slice(0, 30).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}] ${f.type}: "${f.old}" → "${f.new}"`);
});
