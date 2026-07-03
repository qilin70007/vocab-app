/**
 * 修复音标斜杠格式
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let fixed = 0;

for (const word of words) {
  if (word.phonetic && word.phonetic.startsWith('/') && word.phonetic.endsWith('/')) {
    word.phonetic = '[' + word.phonetic.slice(1, -1) + ']';
    fixed++;
  }
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');
console.log(`音标修复: ${fixed} 个`);
