/**
 * 第四轮：清理剩余垃圾例句 + 修复搭配chn为空的情况
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let exRemoved = 0;
let collFixed = 0;
const fixes = [];

for (const word of words) {
  // 清理例句
  if (word.examples && word.examples.length > 0) {
    const wordLower = word.word.toLowerCase();
    const newExamples = [];
    
    for (const ex of word.examples) {
      if (!ex) continue;
      
      let shouldRemove = false;
      
      // 含有 "??" 替换字符
      if (ex.includes('\ufffd') || ex.includes('\u25a1') || ex.includes('\u25cb')) {
        shouldRemove = true;
      }
      
      // 含有大量 OCR 数字+大写字母的残留
      // 如 "be bad for Xf--+- AE" 或 "on average F149; i"
      const englishPart = ex.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef（）《》、，。！？：；""''…—\.\,\!\?\:\;\(\)\[\]\-\/]/g, '').trim();
      if (englishPart.length > 3) {
        const upperCount = (englishPart.match(/[A-Z]/g) || []).length;
        const lowerCount = (englishPart.match(/[a-z]/g) || []).length;
        const digitCount = (englishPart.match(/\d/g) || []).length;
        
        // 如果大写+数字占比很高，且不含目标单词
        if (!ex.toLowerCase().includes(wordLower) && 
            (upperCount + digitCount) > lowerCount && 
            (upperCount + digitCount) > 3) {
          shouldRemove = true;
        }
      }
      
      // 以 "n." "v." "adj." 等开头且不含目标单词 → 字典条目残留
      if (!ex.toLowerCase().includes(wordLower)) {
        if (/^(n|v|adj|adv|conj|prep|pron|art|num|vt|vi|aux)\.\s+[A-Z]/.test(ex)) {
          shouldRemove = true;
        }
        // "word n." 格式（其他单词的词条）
        if (/^[a-z]{2,}\s+(n|v|adj|adv|conj|prep|pron)\./.test(ex)) {
          shouldRemove = true;
        }
        // 以 "== 数字" 开头（页码残留）
        if (/^==\s*\d+/.test(ex)) {
          shouldRemove = true;
        }
        // 以 "& 数字" 开头
        if (/^&\s*\d+/.test(ex)) {
          shouldRemove = true;
        }
      }
      
      if (shouldRemove) {
        exRemoved++;
      } else {
        newExamples.push(ex);
      }
    }
    
    word.examples = newExamples;
  }
  
  // 修复搭配 chn 为空但 eng 含中文的情况
  if (word.collocations) {
    for (let i = 0; i < word.collocations.length; i++) {
      const coll = word.collocations[i];
      if (!coll || typeof coll !== 'object') continue;
      
      let eng = (coll.eng || '').trim();
      let chn = (coll.chn || '').trim();
      
      if (!chn && /[\u4e00-\u9fa5]/.test(eng)) {
        // 再试一次拆分
        const prefixMatch = eng.match(/^(\(\d+\)\s*)/);
        let prefix = '';
        let body = eng;
        if (prefixMatch) {
          prefix = prefixMatch[1];
          body = eng.substring(prefix.length);
        }
        
        const chineseMatch = body.match(/[\u4e00-\u9fa5]/);
        if (chineseMatch) {
          const splitPos = body.indexOf(chineseMatch[0]);
          coll.eng = (prefix + body.substring(0, splitPos)).trim();
          coll.chn = body.substring(splitPos).trim();
          collFixed++;
        }
      }
      
      // 清理 eng 中的 OCR 数字残留
      if (coll.eng && /\d{2,}/.test(coll.eng)) {
        coll.eng = coll.eng.replace(/\s*\d{2,}\s*/g, ' ').trim();
      }
      
      // 如果 eng 是空的，删除这个搭配
      if (!eng && !chn) {
        word.collocations.splice(i, 1);
        i--;
      }
    }
  }
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');

console.log(`第四轮清理: 例句删除 ${exRemoved} 个, 搭配修复 ${collFixed} 个`);
