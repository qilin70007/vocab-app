/**
 * 第一轮自动修复：音标括号
 * /eɪm/ → [eɪm]
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let fixed = 0;
const fixes = [];

for (const word of words) {
  if (!word.phonetic) continue;
  
  // 匹配 /xxx/ 格式，转换为 [xxx]
  const slashMatch = word.phonetic.match(/^\/(.+)\/$/);
  if (slashMatch) {
    const oldPhonetic = word.phonetic;
    word.phonetic = '[' + slashMatch[1] + ']';
    fixed++;
    fixes.push({
      number: word.number,
      word: word.word,
      old: oldPhonetic,
      new: word.phonetic
    });
  }
}

// 保存
fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');

console.log(`音标修复完成: ${fixed} 个`);
console.log('修复样本(前10):');
fixes.slice(0, 10).forEach(f => {
  console.log(`  ${f.word}: ${f.old} → ${f.new}`);
});

// 保存修复日志
fs.writeFileSync('E:\\Tina\\自研背单词软件\\fix_phonetics_log.json', JSON.stringify(fixes, null, 2), 'utf-8');
console.log('修复日志已保存到: fix_phonetics_log.json');
