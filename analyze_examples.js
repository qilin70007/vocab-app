/**
 * 分析剩余"不含单词"的例句
 * 分类：
 * A) 含目标单词的变形（如 accidental → accidents）→ 合理，保留
 * B) 含同根词（如 accurately → accurate）→ 可能合理，标记
 * C) 明显是其他单词的例句（数据错位）→ 删除
 * D) 含 OCR 残留但还有部分可读内容 → 标记
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

const categories = {
  variant: [],      // 单词变形
  related: [],      // 同根词
  wrong_word: [],   // 明显错位
  has_ocr: [],      // 含OCR残留
  other: []         // 其他
};

for (const word of words) {
  if (!word.examples || word.examples.length === 0) continue;
  
  const wordLower = word.word.toLowerCase();
  
  for (let i = 0; i < word.examples.length; i++) {
    const ex = word.examples[i];
    if (!ex) continue;
    
    if (ex.toLowerCase().includes(wordLower)) continue; // 包含单词本身
    
    // 检查变形
    // 简单变形：加s, es, ed, ing, er, est, ly, 变y为i加es等
    const variants = [
      wordLower + 's', wordLower + 'es', wordLower + 'ed', wordLower + 'ing',
      wordLower + 'er', wordLower + 'est', wordLower + 'ly',
      wordLower + 'ies', wordLower + 'ied', wordLower + 'ied',
      wordLower.replace(/y$/, 'ies'),
      wordLower.replace(/y$/, 'ied'),
      wordLower.replace(/y$/, 'ier'),
      wordLower.replace(/y$/, 'iest'),
      wordLower.replace(/e$/, 'ed'),
      wordLower.replace(/e$/, 'ing'),
      wordLower.replace(/e$/, 'er'),
      wordLower.replace(/e$/, 'est'),
      // 双写末尾辅音字母
      wordLower.replace(/([^aeiou])$/, '$1$1ed'),
      wordLower.replace(/([^aeiou])$/, '$1$1ing'),
    ];
    
    let isVariant = false;
    for (const v of variants) {
      if (v !== wordLower && ex.toLowerCase().includes(v)) {
        isVariant = true;
        break;
      }
    }
    
    if (isVariant) {
      categories.variant.push({ word: word.word, ex: ex.substring(0, 100) });
      continue;
    }
    
    // 检查同根词（共享前3+字符）
    const root = wordLower.substring(0, Math.min(4, wordLower.length));
    if (root.length >= 3 && ex.toLowerCase().includes(root)) {
      categories.related.push({ word: word.word, ex: ex.substring(0, 100) });
      continue;
    }
    
    // 检查OCR残留
    if (/[A-Z]{4,}/.test(ex) || /[\ufffd\u25a1\u25cb]/.test(ex)) {
      categories.has_ocr.push({ word: word.word, ex: ex.substring(0, 100) });
      continue;
    }
    
    // 检查是否是其他单词的例句（含可读英文但不相关）
    const englishPart = ex.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef（）《》、，。！？：；""''…—\.\,\!\?\:\;\(\)\[\]\-\/\d]/g, '').trim();
    if (englishPart.length > 5 && /[a-z]{3,}/.test(englishPart)) {
      categories.wrong_word.push({ word: word.word, ex: ex.substring(0, 100) });
    } else {
      categories.other.push({ word: word.word, ex: ex.substring(0, 100) });
    }
  }
}

console.log('========== 例句分析 ==========');
console.log(`单词变形(合理): ${categories.variant.length}`);
console.log(`同根词(可能合理): ${categories.related.length}`);
console.log(`数据错位(应删): ${categories.wrong_word.length}`);
console.log(`含OCR残留(应删): ${categories.has_ocr.length}`);
console.log(`其他: ${categories.other.length}`);

console.log('\n--- 数据错位样本(前20) ---');
categories.wrong_word.slice(0, 20).forEach((c, i) => {
  console.log(`${i + 1}. [${c.word}] ${c.ex}`);
});

console.log('\n--- OCR残留样本(前20) ---');
categories.has_ocr.slice(0, 20).forEach((c, i) => {
  console.log(`${i + 1}. [${c.word}] ${c.ex}`);
});

console.log('\n--- 其他样本(前20) ---');
categories.other.slice(0, 20).forEach((c, i) => {
  console.log(`${i + 1}. [${c.word}] ${c.ex}`);
});

// 保存分析结果
fs.writeFileSync('E:\\Tina\\自研背单词软件\\example_analysis.json', JSON.stringify(categories, null, 2), 'utf-8');
