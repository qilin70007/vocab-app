/**
 * 智能修复搭配 - 根据模式推断
 * 1. "word中文" → "word 中文" (加空格，保留中文翻译)
 * 2. "wordword 中文" → "word 中文" (去重复)
 * 3. "word -- X of N -- 中文" → "word 中文"
 * 4. "word(中文..." → "word 中文"
 */

const fs = require('fs');
const words = JSON.parse(fs.readFileSync('E:\\Tina\\自研背单词软件\\words.json', 'utf-8'));

let fixed = 0;
const samples = [];

for (const w of words) {
  if (!w.collocations) continue;
  
  for (let i = 0; i < w.collocations.length; i++) {
    const c = w.collocations[i];
    if (typeof c !== 'string') continue;
    if (!c.toLowerCase().startsWith(w.word.toLowerCase())) continue;
    
    const after = c.substring(w.word.length);
    if (!/[\u4e00-\u9fa5]/.test(after)) continue;
    
    let newColl = c;
    const word = w.word;
    
    // 1. 处理 "wordword 中文" → "word 中文"
    if (new RegExp('^' + word + word, 'i').test(newColl)) {
      newColl = newColl.substring(word.length).trim();
    }
    
    // 2. 处理 "wordX" (X是其他字母) → "word X" 或 "word"
    // 例: "arrivet(+比较小的地点)" → "arrive (+比较小的地点)"
    const stuckMatch = newColl.match(new RegExp('^' + word + '([a-z])\\b', 'i'));
    if (stuckMatch) {
      // 单词后面紧跟另一个字母（OCR错误）
      newColl = word + ' ' + newColl.substring(word.length);
    }
    
    // 3. 处理 "word" 后直接是中文（无空格）→ 加空格
    // 但要保留 "word X" 中的 X
    // 例: "advise建议某人做某事" → "advise 建议某人做某事"
    
    // 4. 处理页码 "X of N" → 删除
    newColl = newColl.replace(/\s*--\s*\d+\s*of\s*\d+\s*--\s*/g, ' ');
    newColl = newColl.replace(/\s+\d+\s*of\s*\d+\s+/g, ' ');
    
    // 5. 处理 "word重复  中文" → 删除重复
    // 例: "angry生某人的气  angry" → "生某人的气"
    const dupMatch = newColl.match(new RegExp('(.+?)\\s+' + word + '\\s*$', 'i'));
    if (dupMatch) {
      newColl = dupMatch[1].trim();
    }
    
    // 6. 处理 "wordX" 形式 (X是非字母) → 加空格
    // 例: "angry．做某事生气" → "angry. 做某事生气"
    newColl = newColl.replace(new RegExp('^(' + word + ')(\\W)', 'i'), '$1 $2');
    
    // 7. 如果现在以 "word中文" 开头（无空格）→ 加空格
    // 但要保留已经有的英文搭配格式
    const noSpaceMatch = newColl.match(new RegExp('^(' + word + ')([\\u4e00-\\u9fa5])', 'i'));
    if (noSpaceMatch) {
      newColl = word + ' ' + newColl.substring(word.length);
    }
    
    // 8. 清理 "word  中文" 多个空格
    newColl = newColl.replace(/\s+/g, ' ').trim();
    
    // 9. 清理单独的 word (无中文，无其他内容) → 保留为 word
    if (newColl === word) continue;
    
    if (newColl !== c) {
      samples.push({ word: w.word, old: c, new: newColl });
      w.collocations[i] = newColl;
      fixed++;
    }
  }
}

fs.writeFileSync('E:\\Tina\\自研背单词软件\\words.json', JSON.stringify(words, null, 2), 'utf-8');

console.log('修复: ' + fixed + ' 个');
console.log('\n样本(前30):');
samples.slice(0, 30).forEach((s, i) => {
  console.log((i + 1) + '. [' + s.word + ']');
  console.log('   旧: "' + s.old + '"');
  console.log('   新: "' + s.new + '"');
});
