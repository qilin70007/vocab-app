/**
 * 第四轮清理 - 分割英文和乱码中文
 * 保留英文部分，删除OCR乱码的中文翻译
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let cleaned = 0;
let kept = 0;
let removed = 0;
const fixes = [];

for (const word of words) {
  if (!word.examples || word.examples.length === 0) continue;
  
  const wordLower = word.word.toLowerCase();
  const newExamples = [];
  
  for (const ex of word.examples) {
    if (!ex) continue;
    
    // 尝试分割英文和乱码中文
    const match = ex.match(/^([A-Z][^.!?]*[.!?])\s*(.*)$/);
    
    if (match) {
      const english = match[1].trim();
      const chinese = match[2].trim();
      
      // 检查中文部分是否真的是乱码
      const chineseIsGarbage = chinese && !/[\u4e00-\u9fa5]/.test(chinese) && /[A-Z]{2,}/.test(chinese);
      const englishIsReadable = english.length > 5 && /[a-z]/.test(english);
      
      if (chineseIsGarbage && englishIsReadable) {
        // 检查英文是否含目标单词
        if (english.toLowerCase().includes(wordLower)) {
          // 保留英文部分，删除乱码中文
          newExamples.push(english);
          cleaned++;
          fixes.push({ word: word.word, action: 'cleaned', original: ex.substring(0, 100), cleaned: english });
        } else {
          // 英文不含目标单词，删除整个例句
          removed++;
          fixes.push({ word: word.word, action: 'removed', original: ex.substring(0, 100) });
        }
      } else {
        // 不需要处理
        newExamples.push(ex);
        kept++;
      }
    } else {
      // 没有匹配的句号，保留原样
      newExamples.push(ex);
      kept++;
    }
  }
  
  word.examples = newExamples;
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');

console.log(`第四轮清理:`);
console.log(`  清理(保留英文删除乱码): ${cleaned}`);
console.log(`  保留(原样): ${kept}`);
console.log(`  删除(英文不含目标词): ${removed}`);

console.log('\n--- 清理样本(前15) ---');
fixes.filter(f => f.action === 'cleaned').slice(0, 15).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}]`);
  console.log(`   原: ${f.original}`);
  console.log(`   新: ${f.cleaned}`);
});

console.log('\n--- 删除样本(前10) ---');
fixes.filter(f => f.action === 'removed').slice(0, 10).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}] ${f.original}`);
});
