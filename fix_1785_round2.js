/**
 * 第二轮清理 - 处理含OCR残留的例句
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
    
    let shouldRemove = false;
    
    // 1. 含 # 数字 等OCR残留
    if (/#[\d°]/.test(ex)) {
      shouldRemove = true;
    }
    
    // 2. 含大量大写字母（OCR残留）
    const englishPart = ex.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef（）《》、，。！？：；""''…—\.\,\!\?\:\;\(\)\[\]\-\/\d]/g, '').trim();
    if (englishPart.length > 5) {
      const upperCount = (englishPart.match(/[A-Z]/g) || []).length;
      const lowerCount = (englishPart.match(/[a-z]/g) || []).length;
      // 大写字母明显多于小写
      if (upperCount > lowerCount && upperCount > 3) {
        shouldRemove = true;
      }
    }
    
    // 3. 含特殊OCR残留字符
    if (/[\ufffd\u25a1\u25cb°]/.test(ex)) {
      shouldRemove = true;
    }
    
    // 4. 以 "or?" "oreu?" 等开头（OCR残留）
    if (/^[a-z]+\?/i.test(ex) && ex.length > 20) {
      shouldRemove = true;
    }
    
    // 5. 例句开头有大写乱码单词（如 "Se EUs" "KLAR"）
    if (/^[A-Z]{2,}\s+[A-Z]{2,}/.test(ex)) {
      shouldRemove = true;
    }
    
    if (shouldRemove) {
      removed++;
      fixes.push({ word: word.word, value: ex.substring(0, 80) });
    } else {
      newExamples.push(ex);
    }
  }
  
  word.examples = newExamples;
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');

console.log(`第二轮清理: ${removed} 个例句删除`);
console.log('\n删除样本(前20):');
fixes.slice(0, 20).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}] ${f.value}`);
});
