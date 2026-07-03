/**
 * 安全修复脚本 - 只做确定无误的修复
 * 
 * 1. 音标 /xxx/ → [xxx]
 * 2. 搭配 eng/chn 拆分（chn为空，eng含中文时拆分）
 * 3. "adultadult" → "adult" (完全重复)
 * 4. "accidentt" → "accident" (word + 1-2个残留字符)
 * 
 * 不做：
 * - 不猜测缺失空格（太容易误判）
 * - 不修改例句
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let phoneticFixed = 0;
let collSplit = 0;
let collCleaned = 0;
const fixes = [];

for (const word of words) {
  // 1. 音标 /xxx/ → [xxx]
  if (word.phonetic && word.phonetic.startsWith('/') && word.phonetic.endsWith('/')) {
    word.phonetic = '[' + word.phonetic.slice(1, -1) + ']';
    phoneticFixed++;
  }
  
  if (!word.collocations) continue;
  
  for (let i = 0; i < word.collocations.length; i++) {
    const coll = word.collocations[i];
    if (!coll || typeof coll !== 'object') continue;
    
    let eng = (coll.eng || '').trim();
    let chn = (coll.chn || '').trim();
    
    // 2. 如果 chn 为空，eng 中有中文，拆分
    if (!chn && /[\u4e00-\u9fa5]/.test(eng)) {
      const prefixMatch = eng.match(/^(\(\d+\)\s*)/);
      let prefix = '';
      let body = eng;
      if (prefixMatch) {
        prefix = prefixMatch[1];
        body = eng.substring(prefix.length);
      }
      
      const chineseMatch = body.match(/[\u4e00-\u9fa5]/);
      if (chineseMatch) {
        const splitPos = body.indexOf(chineseMatch[0]);
        const engPart = (prefix + body.substring(0, splitPos)).trim();
        const chnPart = body.substring(splitPos).trim();
        
        const oldEng = coll.eng;
        const oldChn = coll.chn;
        coll.eng = engPart;
        coll.chn = chnPart;
        collSplit++;
        fixes.push({
          word: word.word, type: 'split',
          old_eng: oldEng, old_chn: oldChn,
          new_eng: engPart, new_chn: chnPart
        });
      }
      continue; // 拆分后跳过后续清理
    }
    
    // 3. "adultadult" → "adult" (完全重复)
    if (eng) {
      const wordLower = word.word.toLowerCase();
      const engLower = eng.toLowerCase().trim();
      
      if (engLower === wordLower + wordLower) {
        coll.eng = word.word;
        collCleaned++;
        fixes.push({ word: word.word, type: 'dup_clean', old: eng, new: word.word });
        continue;
      }
      
      // 4. "accidentt" → "accident" (word + 1-2个残留)
      // 只在 eng 被拆分后（chn已有值）才处理
      if (engLower.startsWith(wordLower) && engLower.length > wordLower.length && chn) {
        const remainder = engLower.substring(wordLower.length);
        if (remainder.length <= 2 && !/^[a-z]{2,}$/.test(remainder)) {
          coll.eng = word.word;
          collCleaned++;
          fixes.push({ word: word.word, type: 'suffix_clean', old: eng, new: word.word });
        }
      }
    }
  }
}

// 保存
fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');

console.log('========== 修复结果 ==========');
console.log(`音标修复: ${phoneticFixed} 个`);
console.log(`搭配拆分: ${collSplit} 个`);
console.log(`搭配清理: ${collCleaned} 个`);
console.log(`总修复: ${phoneticFixed + collSplit + collCleaned} 处`);

console.log('\n清理样本:');
fixes.filter(f => f.type !== 'split').slice(0, 20).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}] ${f.type}: "${f.old}" → "${f.new}"`);
});

// 保存日志
fs.writeFileSync('E:\\Tina\\自研背单词软件\\fix_safe_log.json', JSON.stringify(fixes, null, 2), 'utf-8');
console.log('\n日志已保存到: fix_safe_log.json');
