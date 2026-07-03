/**
 * 第五轮清理 - 处理开头的OCR乱码前缀
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let cleaned = 0;
let removed = 0;
const fixes = [];

for (const word of words) {
  if (!word.examples || word.examples.length === 0) continue;
  
  const wordLower = word.word.toLowerCase();
  const newExamples = [];
  
  for (const ex of word.examples) {
    if (!ex) continue;
    
    // 检查是否以OCR乱码前缀开头
    const m = ex.match(/^([A-Za-z]{1,4}[=:][\s\-]?|\b(?:Ale|ore|corUe|seeus|sTe8|ooFYe|cert|cou|coe|sore|SWE|~+|=\s|&\s|\d+\.)\b[\s\-]?)([A-Z].*)$/);
    
    if (m) {
      const cleaned_text = m[2].trim();
      // 提取英文部分
      const engMatch = cleaned_text.match(/^([^.!?]*[.!?])\s*(.*)$/);
      if (engMatch) {
        const english = engMatch[1].trim();
        const chinese = engMatch[2].trim();
        if (english.toLowerCase().includes(wordLower)) {
          newExamples.push(english);
          cleaned++;
          fixes.push({ word: word.word, action: 'cleaned', original: ex.substring(0, 80), cleaned: english });
        } else {
          removed++;
        }
      } else {
        newExamples.push(cleaned_text);
        cleaned++;
      }
    } else {
      newExamples.push(ex);
    }
  }
  
  word.examples = newExamples;
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');

console.log(`第五轮清理: 清理 ${cleaned} 个, 删除 ${removed} 个`);
console.log('\n--- 样本 ---');
fixes.slice(0, 20).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}]`);
  console.log(`   原: ${f.original}`);
  console.log(`   新: ${f.cleaned}`);
});
