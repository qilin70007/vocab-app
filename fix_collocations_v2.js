/**
 * 搭配修复脚本 - 分批处理
 * 
 * 策略：
 * 1. 对于 "word中文" 格式（如 "afraid害怕某事"），去掉单词前缀
 * 2. 对于 "word中文  word" 格式（重复出现），只保留中间内容
 * 3. 对于包含词典条目格式（如 "word[phonetic] n. 中文"），移到词性变形区
 * 4. 对于 "-- X of 90 --" 这种页码残留，清除
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let fixedCount = 0;
const fixes = [];

function cleanCollocation(wordStr, coll) {
  let cleaned = coll;
  let changed = false;
  const wordLower = wordStr.toLowerCase();
  
  // 1. 去掉 "-- X of 90 --" 页码残留
  cleaned = cleaned.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim();
  
  // 2. 去掉重复出现的单词（如 "agree意见 -- 1 of 90 -- 一致  agree" → "意见 一致"）
  // 先处理尾部重复
  const tailWordPattern = new RegExp('\\s+' + wordLower + '\\s*$', 'i');
  cleaned = cleaned.replace(tailWordPattern, '').trim();
  
  // 3. 处理 "word中文" 格式
  // 如果搭配以单词开头且紧跟中文
  const wordPrefixPattern = new RegExp('^' + wordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (wordPrefixPattern.test(cleaned)) {
    const afterWord = cleaned.substring(wordLower.length);
    // 如果剩余部分是纯中文或中文+英文混合
    if (/[\u4e00-\u9fa5]/.test(afterWord)) {
      // 检查是否是 "word中文中文 word中文中文" 这种多个搭配被连在一起的情况
      // 如 "act动作 影片  act积极的  act活动"
      const parts = cleaned.split(new RegExp(wordLower, 'i')).filter(p => p.trim());
      if (parts.length > 1) {
        // 多个搭配被连在一起，用分号连接
        cleaned = parts.map(p => p.trim()).join('；');
        changed = true;
      } else {
        // 单个搭配，去掉单词前缀
        cleaned = afterWord.trim();
        changed = true;
      }
    }
  }
  
  // 4. 去掉开头的序号前缀如 "(1)", "1."（保留原有序号格式）
  // 不处理序号，保留原格式
  
  // 5. 清理多余空格
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  
  if (cleaned !== coll) {
    changed = true;
  }
  
  return { value: cleaned, changed };
}

for (const word of words) {
  if (!word.collocations) continue;
  
  for (let i = 0; i < word.collocations.length; i++) {
    const original = word.collocations[i];
    if (!original) continue;
    
    const result = cleanCollocation(word.word, original);
    if (result.changed) {
      word.collocations[i] = result.value;
      fixedCount++;
      fixes.push({
        number: word.number,
        word: word.word,
        index: i,
        old: original,
        new: result.value
      });
    }
  }
}

// 保存
fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');

console.log(`搭配修复完成: ${fixedCount} 处`);
console.log('\n修复样本(前30):');
fixes.slice(0, 30).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}]`);
  console.log(`   旧: "${f.old}"`);
  console.log(`   新: "${f.new}"`);
});

// 保存修复日志
fs.writeFileSync('E:\\Tina\\自研背单词软件\\fix_collocations_log.json', JSON.stringify(fixes, null, 2), 'utf-8');
console.log(`\n修复日志已保存到: fix_collocations_log.json`);
