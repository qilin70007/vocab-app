/**
 * 修复1785词版本的数据问题
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let phoneticFixed = 0;
let exRemoved = 0;
const fixes = [];

for (const word of words) {
  // 1. 修复音标格式
  if (word.phonetic && word.phonetic.startsWith('/') && word.phonetic.endsWith('/')) {
    word.phonetic = word.phonetic.replace(/^\//, '[').replace(/\/$/, ']');
    phoneticFixed++;
  }
  
  // 2. 清理例句
  if (word.examples && word.examples.length > 0) {
    const wordLower = word.word.toLowerCase();
    const newExamples = [];
    
    for (const ex of word.examples) {
      if (!ex) continue;
      
      let shouldRemove = false;
      let reason = '';
      
      // 纯OCR乱码
      const englishPart = ex.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef（）《》、，。！？：；""''…—\.\,\!\?\:\;\(\)\[\]\-\/\d]/g, '').trim();
      if (englishPart.length > 10) {
        const upperCount = (englishPart.match(/[A-Z]/g) || []).length;
        const lowerCount = (englishPart.match(/[a-z]/g) || []).length;
        if (upperCount > lowerCount * 2 && upperCount > 5) {
          shouldRemove = true;
          reason = 'ocr_garbage';
        }
      }
      
      // 含 ?? 替换字符
      if (/[\ufffd\u25a1\u25cb]/.test(ex)) {
        shouldRemove = true;
        reason = 'replacement_char';
      }
      
      // 数据错位（例句属于其他单词）
      if (!shouldRemove && !ex.toLowerCase().includes(wordLower)) {
        // 检查是否是变形
        const variants = [
          wordLower + 's', wordLower + 'es', wordLower + 'ed', wordLower + 'ing',
          wordLower + 'er', wordLower + 'est', wordLower + 'ly',
          wordLower.replace(/y$/, 'ies'), wordLower.replace(/y$/, 'ied'),
          wordLower.replace(/e$/, 'ed'), wordLower.replace(/e$/, 'ing'),
        ];
        let isVariant = false;
        for (const v of variants) {
          if (v.length > 3 && ex.toLowerCase().includes(v)) {
            isVariant = true;
            break;
          }
        }
        // 检查同根词
        if (!isVariant && wordLower.length >= 4) {
          const root = wordLower.substring(0, 4);
          if (ex.toLowerCase().includes(root)) {
            isVariant = true;
          }
        }
        if (!isVariant) {
          shouldRemove = true;
          reason = 'wrong_word';
        }
      }
      
      if (shouldRemove) {
        exRemoved++;
        fixes.push({ word: word.word, reason, value: ex.substring(0, 80) });
      } else {
        newExamples.push(ex);
      }
    }
    
    word.examples = newExamples;
  }
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');

console.log('========== 修复结果 ==========');
console.log(`音标修复: ${phoneticFixed}`);
console.log(`例句删除: ${exRemoved}`);
console.log('\n删除样本(前20):');
fixes.slice(0, 20).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}] ${f.reason}: "${f.value}"`);
});
