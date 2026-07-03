/**
 * 修复音标斜杠格式 + 修复搭配中残留的问题
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let phoneticFixed = 0;
let collCleaned = 0;
const fixes = [];

for (const word of words) {
  // 1. 修复音标 /xxx/ → [xxx]
  if (word.phonetic && word.phonetic.startsWith('/') && word.phonetic.endsWith('/')) {
    const old = word.phonetic;
    word.phonetic = '[' + word.phonetic.slice(1, -1) + ']';
    phoneticFixed++;
    if (phoneticFixed <= 5) {
      console.log(`音标: ${word.word}: ${old} → ${word.phonetic}`);
    }
  }
  
  // 2. 修复搭配 eng 中的单词重复（如 "adultadult" → "adult"）
  if (word.collocations) {
    for (let i = 0; i < word.collocations.length; i++) {
      const coll = word.collocations[i];
      if (!coll || typeof coll !== 'object') continue;
      
      if (coll.eng) {
        const wordLower = word.word.toLowerCase();
        const engLower = coll.eng.toLowerCase().trim();
        
        // "adultadult" → "adult"
        if (engLower === wordLower + wordLower) {
          coll.eng = word.word;
          collCleaned++;
          fixes.push({ word: word.word, type: 'duplicate', old: engLower, new: word.word });
        }
        // "accidentt" → "accident" (word + 1-2 char garbage)
        else if (engLower.startsWith(wordLower) && engLower.length > wordLower.length) {
          const remainder = engLower.substring(wordLower.length);
          // 如果残留是1-2个字符且不是有意义的英文单词
          if (remainder.length <= 2 && !/^[a-z]{2,}$/.test(remainder)) {
            coll.eng = word.word;
            collCleaned++;
            fixes.push({ word: word.word, type: 'garbage_suffix', old: engLower, new: word.word });
          }
        }
        
        // "agirl" → "a girl" (缺少空格)
        // 匹配 "a" + 单词 的情况
        if (engLower.length > 1 && !engLower.includes(' ')) {
          // 尝试在单词边界拆分
          // 如 "agirl" → "a girl", "aset" → "a set"
          const match = engLower.match(/^(a|an|the|be|do|have|go|get|take|make|give|keep|put|turn|look|come|show|set|let)([a-z]{2,})/);
          if (match && match[1] !== wordLower) {
            // 不是单词本身的重复，是搭配缺少空格
            coll.eng = match[1] + ' ' + match[2];
            collCleaned++;
            fixes.push({ word: word.word, type: 'missing_space', old: engLower, new: coll.eng });
          }
        }
      }
      
      // 3. 清理 chn 中残留的英文（如 "缺席  absent出席"）
      if (coll.chn && /[a-zA-Z]/.test(coll.chn)) {
        // 如果 chn 中有 "英文中文" 混合，尝试清理
        // 如 "缺席  absent出席" → 应该拆成两个搭配
        // 这种情况比较复杂，先标记不自动处理
      }
    }
  }
}

// 保存
fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');

console.log(`\n========== 修复结果 ==========`);
console.log(`音标修复: ${phoneticFixed} 个`);
console.log(`搭配清理: ${collCleaned} 个`);
console.log('\n搭配修复样本(前30):');
fixes.slice(0, 30).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}] ${f.type}: "${f.old}" → "${f.new}"`);
});

// 保存日志
fs.writeFileSync('E:\\Tina\\自研背单词软件\\fix_round2_log.json', JSON.stringify(fixes, null, 2), 'utf-8');
