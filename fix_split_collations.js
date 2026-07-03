/**
 * 修复搭配：拆分 eng 字段中混合的英文和中文
 * 
 * 策略：
 * 1. 如果 chn 为空，但 eng 中包含中文，则尝试拆分
 *    - 找到第一个中文字符的位置，前面是英文，后面是中文
 *    - 处理特殊情况：序号前缀、多个搭配混在一起等
 * 2. 修复音标斜杠格式
 * 3. 清理 OCR 垃圾
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let collFixed = 0;
let phoneticFixed = 0;
const fixes = [];

for (const word of words) {
  // 1. 修复音标 /xxx/ → [xxx]
  if (word.phonetic && word.phonetic.includes('/')) {
    const slashMatch = word.phonetic.match(/^\/(.+)\/$/);
    if (slashMatch) {
      word.phonetic = '[' + slashMatch[1] + ']';
      phoneticFixed++;
    }
  }
  
  // 2. 修复搭配
  if (word.collocations && word.collocations.length > 0) {
    for (let i = 0; i < word.collocations.length; i++) {
      const coll = word.collocations[i];
      if (!coll || typeof coll !== 'object') continue;
      
      let eng = (coll.eng || '').trim();
      let chn = (coll.chn || '').trim();
      
      // 如果 chn 为空，eng 中有中文，需要拆分
      if (!chn && /[\u4e00-\u9fa5]/.test(eng)) {
        // 去掉序号前缀 (1) (2) 等
        const prefixMatch = eng.match(/^(\(\d+\)\s*)/);
        let prefix = '';
        let body = eng;
        if (prefixMatch) {
          prefix = prefixMatch[1];
          body = eng.substring(prefix.length);
        }
        
        // 找到第一个中文字符的位置
        const chineseMatch = body.match(/[\u4e00-\u9fa5]/);
        if (chineseMatch) {
          const splitPos = body.indexOf(chineseMatch[0]);
          const engPart = (prefix + body.substring(0, splitPos)).trim();
          const chnPart = body.substring(splitPos).trim();
          
          // 验证：英文部分应该有至少一个英文字母
          if (/[a-zA-Z]/.test(engPart) || engPart.length === 0) {
            const oldEng = coll.eng;
            const oldChn = coll.chn;
            coll.eng = engPart;
            coll.chn = chnPart;
            collFixed++;
            fixes.push({
              number: word.number,
              word: word.word,
              index: i,
              old_eng: oldEng,
              old_chn: oldChn,
              new_eng: coll.eng,
              new_chn: coll.chn
            });
          }
        }
      }
      
      // 3. 修复 "word中文" 格式 - 单词前缀粘连
      // 如 "accidentt  车祸" → eng="accident t", chn="车祸"
      // 如 "afraid害怕某事" → eng="afraid", chn="害怕某事"  
      // 实际上这些在上面的拆分逻辑中已经被处理了
      // 但 "accidentt  车祸" 拆分后 eng="accidentt", chn="车祸"
      // 需要进一步清理 eng 中的乱码
      
      // 4. 清理 eng 中的单词重复
      // 如 "adultadult  一个成年人" 拆分后 eng="adultadult", chn="一个成年人"
      // 修正 eng 为 "adult"
      if (coll.eng && chn) {
        // 检查 eng 是否是单词的重复
        const wordLower = word.word.toLowerCase();
        const engLower = coll.eng.toLowerCase().trim();
        if (engLower === wordLower + wordLower) {
          coll.eng = word.word;
        } else if (engLower.startsWith(wordLower) && engLower.length > wordLower.length) {
          // 如 "accidentt" → 可能是 "accident" + OCR残留
          const remainder = engLower.substring(wordLower.length);
          // 如果残留只有1-2个字符且不是有意义的英文
          if (remainder.length <= 2 && !/^[a-z]{2,}$/.test(remainder)) {
            coll.eng = word.word;
          }
        }
      }
    }
  }
}

// 保存
fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');

console.log('========== 修复结果 ==========');
console.log(`音标修复: ${phoneticFixed} 个`);
console.log(`搭配拆分修复: ${collFixed} 个`);
console.log('\n修复样本(前40):');
fixes.slice(0, 40).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}]`);
  console.log(`   旧: eng="${f.old_eng}" chn="${f.old_chn}"`);
  console.log(`   新: eng="${f.new_eng}" chn="${f.new_chn}"`);
});

// 保存修复日志
fs.writeFileSync('E:\\Tina\\自研背单词软件\\fix_split_log.json', JSON.stringify(fixes, null, 2), 'utf-8');
console.log(`\n修复日志已保存到: fix_split_log.json`);
