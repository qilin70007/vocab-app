/**
 * 第三轮清理 - 只删除含明显OCR残留的例句
 * 保留可读的英文例句
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
    
    // 1. 明显的OCR残留：英文部分开头有大写乱码（"Se EUs Do you like..."）
    // 特征：前10个字符内有两个大写词但无空格
    const prefix = ex.substring(0, 15);
    if (/^[A-Z]{2,4}[a-z]?[A-Z]/.test(prefix.replace(/[\u4e00-\u9fa5]/g, ''))) {
      shouldRemove = true;
    }
    
    // 2. 英文部分中间有大写乱码词（如 "Coffee is ready. How nice it smells!"）
    // 实际上这种是可读的，只删除那些明显乱码的
    // 特征：例句短且大写字母占比高
    if (!shouldRemove) {
      const englishPart = ex.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef（）《》、，。！？：；""''…—\.\,\!\?\:\;\(\)\[\]\-\/]/g, '').trim();
      if (englishPart.length > 3 && englishPart.length < 30) {
        const upperCount = (englishPart.match(/[A-Z]/g) || []).length;
        const lowerCount = (englishPart.match(/[a-z]/g) || []).length;
        // 短字符串且大写多于小写，且不是问句
        if (upperCount > lowerCount && !ex.includes('?')) {
          shouldRemove = true;
        }
      }
    }
    
    // 3. 含特殊OCR标记字符
    if (/[\ufffd\u25a1\u25cb]/.test(ex)) {
      shouldRemove = true;
    }
    
    // 4. 含 # 数字 残留
    if (/#\d/.test(ex)) {
      shouldRemove = true;
    }
    
    // 5. 含连续大写字母乱码（如 "AM ZR" "SWB"）
    if (/\b[A-Z]{3,}\b/.test(ex) && ex.length < 50) {
      shouldRemove = true;
    }
    
    // 6. 例句开头的OCR残留（如 "or?" "oreu?" "creus" "enn" "ones"）
    if (/^(or|ore|oreu|creus|enn|ones|sexu|steus|serus|sEu|S7E|S73|AMR|KARAT|SWARM|SWB|sEu3|sTEU|STEU|a|SER)[\s\?]/i.test(ex)) {
      shouldRemove = true;
    }
    
    // 7. 以 "== 数字" 或 "& 数字" 开头（页码残留）
    if (/^[=&\s]+\d+/.test(ex)) {
      shouldRemove = true;
    }
    
    // 8. 以 "n." "v." "adj." 开头（其他单词的字典条目）
    if (/^(n|v|adj|adv|conj|prep|pron|art|num|vt|vi)\.\s+[A-Z]/.test(ex)) {
      shouldRemove = true;
    }
    
    if (shouldRemove) {
      removed++;
      fixes.push({ word: word.word, value: ex.substring(0, 100) });
    } else {
      newExamples.push(ex);
    }
  }
  
  word.examples = newExamples;
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');

console.log(`第三轮清理: ${removed} 个例句删除`);
console.log('\n删除样本(前30):');
fixes.slice(0, 30).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}] ${f.value}`);
});
