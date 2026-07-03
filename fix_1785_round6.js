/**
 * 第六轮 - 手动清理剩余的13个OCR乱码例句
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

// 需要处理的单词和它们的清理方式
const fixes = {
  'allow': 'clean',       // 英文部分乱码太严重，删除
  'beautifully': 'clean',  // =p 前缀 + #U2 乱码
  'dentist': 'clean',      // [have got 前缀
  'dinner': 'clean',       // = Nick 前缀
  'explore': 'clean',      // ~~ orkue 前缀
  'interest': 'clean',     // sTe8 前缀
  'inventor': 'clean',     // oerve 前缀
  'railway': 'clean',      // =R crtv3 前缀
  'student': 'clean',      // —_ 前缀
  'sugar': 'clean',        // "FY 前缀
  'tennis': 'clean',       // coe 前缀
  'tip': 'remove',         // 完全乱码
  'group': 'ok',           // 已经被清理过了，但审计仍标记
};

let changed = 0;

for (const word of words) {
  if (!word.examples || word.examples.length === 0) continue;
  
  const action = fixes[word.word.toLowerCase()];
  if (!action) continue;
  
  const wordLower = word.word.toLowerCase();
  const newExamples = [];
  
  for (const ex of word.examples) {
    if (!ex) continue;
    
    if (action === 'remove') {
      // 完全删除
      console.log(`[删除] ${word.word}: ${ex.substring(0, 80)}`);
      changed++;
      continue;
    }
    
    if (action === 'clean') {
      // 尝试提取英文部分
      // 去掉开头的乱码前缀
      let cleaned = ex
        .replace(/^[=\-~_]*\s*/, '')  // 去掉 = - ~ _ 开头
        .replace(/^[A-Z][a-z]?[=:][\s\-]?/, '') // 去掉 =p, =R 等
        .replace(/^(Ale|ore|corUe|seeus|sTe8|ooFYe|cert|cou|coe|sore|oerve|orkue|crtv3|P\s+\d+)\s+/i, '') // 去掉特定前缀
        .replace(/^[—\-_]+\s*/, '') // 去掉 —_
        .replace(/^["\u201c\u201d]\s*/, '') // 去掉引号
        .replace(/^[A-Z]{2,}[a-z]?\s+([A-Z])/, '$1') // 去掉开头的大写乱码词
        .trim();
      
      // 提取英文句子部分
      const engMatch = cleaned.match(/^([^.!?]*[.!?])\s*(.*)$/);
      if (engMatch) {
        const english = engMatch[1].trim();
        if (english.toLowerCase().includes(wordLower) && english.length > 10) {
          newExamples.push(english);
          console.log(`[清理] ${word.word}: "${ex.substring(0, 60)}..." → "${english}"`);
          changed++;
        } else {
          console.log(`[删除] ${word.word}: 英文部分不含目标词 "${english.substring(0, 60)}"`);
          changed++;
        }
      } else {
        // 没有句号结尾，尝试直接用清理后的文本
        if (cleaned.toLowerCase().includes(wordLower) && /[a-z]/.test(cleaned) && cleaned.length > 10) {
          newExamples.push(cleaned);
          console.log(`[清理] ${word.word}: "${ex.substring(0, 60)}..." → "${cleaned}"`);
          changed++;
        } else {
          console.log(`[删除] ${word.word}: 无法提取英文 "${cleaned.substring(0, 60)}"`);
          changed++;
        }
      }
    } else {
      newExamples.push(ex);
    }
  }
  
  word.examples = newExamples;
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');
console.log(`\n总共处理: ${changed} 个`);
