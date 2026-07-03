/**
 * 第三轮例句清理 - 删除数据错位和OCR残留
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let removed = 0;
const fixes = [];

for (const word of words) {
  if (!word.examples || word.examples.length === 0) continue;
  
  const wordLower = word.word.toLowerCase();
  const newExamples = [];
  
  for (const ex of word.examples) {
    if (!ex) continue;
    
    // 如果包含单词本身，保留
    if (ex.toLowerCase().includes(wordLower)) {
      newExamples.push(ex);
      continue;
    }
    
    // 检查是否是变形
    const variants = [
      wordLower + 's', wordLower + 'es', wordLower + 'ed', wordLower + 'ing',
      wordLower + 'er', wordLower + 'est', wordLower + 'ly',
      wordLower + 'ies', wordLower + 'ied',
      wordLower.replace(/y$/, 'ies'),
      wordLower.replace(/y$/, 'ied'),
      wordLower.replace(/y$/, 'ier'),
      wordLower.replace(/y$/, 'iest'),
      wordLower.replace(/e$/, 'ed'),
      wordLower.replace(/e$/, 'ing'),
      wordLower.replace(/e$/, 'er'),
      wordLower.replace(/e$/, 'est'),
    ];
    
    let isVariant = false;
    for (const v of variants) {
      if (v !== wordLower && v.length > 3 && ex.toLowerCase().includes(v)) {
        isVariant = true;
        break;
      }
    }
    
    if (isVariant) {
      newExamples.push(ex);
      continue;
    }
    
    // 检查同根词（共享前4字符，且长度>=4）
    const root = wordLower.substring(0, Math.min(4, wordLower.length));
    if (root.length >= 4 && ex.toLowerCase().includes(root)) {
      newExamples.push(ex);
      continue;
    }
    
    // 剩余的全部删除（数据错位、OCR残留、纯乱码）
    removed++;
    fixes.push({ word: word.word, value: ex.substring(0, 100) });
  }
  
  word.examples = newExamples;
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');

console.log(`第三轮清理: ${removed} 个例句删除`);
console.log('\n删除样本(前30):');
fixes.slice(0, 30).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}] ${f.value}`);
});

fs.writeFileSync('E:\\Tina\\自研背单词软件\\fix_examples3_log.json', JSON.stringify(fixes, null, 2), 'utf-8');
