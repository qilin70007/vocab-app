/**
 * 修复音标 [/xxx/] → [xxx]
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let fixed = 0;

for (const word of words) {
  if (word.phonetic && word.phonetic.includes('/')) {
    const old = word.phonetic;
    // 去掉所有斜杠，保留方括号
    word.phonetic = word.phonetic.replace(/\//g, '');
    fixed++;
    if (fixed <= 10) {
      console.log(`  ${word.word}: ${old} → ${word.phonetic}`);
    }
  }
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');
console.log(`\n音标修复: ${fixed} 个`);
