/**
 * 扫描所有单词，找出类似的搭配问题
 * 模式：搭配以单词本身开头但后面跟中文翻译（OCR错位）
 */

const fs = require('fs');
const words = JSON.parse(fs.readFileSync('E:\\Tina\\自研背单词软件\\words.json', 'utf-8'));

const issues = [];

for (const w of words) {
  if (!w.collocations || w.collocations.length === 0) continue;
  
  for (let i = 0; i < w.collocations.length; i++) {
    const coll = w.collocations[i];
    if (typeof coll !== 'string') continue;
    
    const wordLower = w.word.toLowerCase();
    const collLower = coll.toLowerCase();
    
    // 检查模式1: 搭配以单词+重复字母开头（"accidentt"、"abilityy"等）
    // 模式: ^word(\w*)\s*[\u4e00-\u9fa5]
    const dupMatch = coll.match(/^([a-zA-Z]+?)(\w*?)\s+([\u4e00-\u9fa5].*)$/);
    if (dupMatch) {
      const start = dupMatch[1].toLowerCase();
      // 检查是否是单词本身的重复或OCR错位
      if (start === wordLower || start === wordLower + wordLower) {
        issues.push({
          word: w.word,
          index: i,
          current: coll,
          type: 'word_repetition',
          reason: '搭配以单词本身或单词重复开头'
        });
        continue;
      }
      // 检查是否是单词+其他字母
      if (start.length >= wordLower.length - 1 && collLower.indexOf(wordLower) === 0) {
        const rest = coll.substring(wordLower.length).trim();
        if (/[\u4e00-\u9fa5]/.test(rest)) {
          issues.push({
            word: w.word,
            index: i,
            current: coll,
            type: 'word_plus_chinese',
            reason: '搭配以单词开头，后面紧跟中文（OCR错位）'
          });
          continue;
        }
      }
    }
    
    // 检查模式2: 搭配以单词开头但英文部分没有空格（单词未结束）
    if (collLower.startsWith(wordLower) && !collLower.startsWith(wordLower + ' ') && !collLower.startsWith(wordLower + '\u00a0')) {
      const afterWord = coll.substring(w.word.length);
      if (/[\u4e00-\u9fa5]/.test(afterWord)) {
        issues.push({
          word: w.word,
          index: i,
          current: coll,
          type: 'word_stuck_chinese',
          reason: '单词和中文黏在一起'
        });
      }
    }
  }
}

console.log(`找到 ${issues.length} 个有问题的搭配\n`);
console.log('问题列表:');
issues.forEach((issue, i) => {
  console.log(`${i + 1}. [${issue.word}] [${issue.index}] ${issue.type}`);
  console.log(`   当前: "${issue.current}"`);
  console.log(`   原因: ${issue.reason}`);
});
