/**
 * 第九轮 - 清理剩余的OCR前缀
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let cleaned = 0;

// 已知的OCR前缀模式
const prefixes = [
  'ores', 'ort', 'ort0t', 'or"', "or'", 'o7EU3', 'omy,', 'ers', 'esrYe',
  'crev3', 'cers', 'sotUL', 'sets', 'soEUS', 's7kM4', 'sTe8', 'seeus',
  'serus', 'sTEU', 'STEU', 'sEu', 'sEu3', 'S7E', 'S73', 'corUe',
  'ooFYe', 'cert', 'cou', 'coe', 'sore', 'oerve', 'orkue', 'crtv3',
  'orev4', 'an |', '40)', 'x"', '=p', '=>', '=I', '=F', '=v', 'oreu',
  'orev4', 'Pm', 'Ti', '1 like'
];

for (const word of words) {
  if (!word.examples || word.examples.length === 0) continue;
  
  const wordLower = word.word.toLowerCase();
  const newExamples = [];
  
  for (const ex of word.examples) {
    if (!ex) continue;
    
    let cleaned_ex = ex;
    
    // 去掉已知前缀
    for (const prefix of prefixes) {
      if (cleaned_ex.toLowerCase().startsWith(prefix.toLowerCase() + ' ')) {
        cleaned_ex = cleaned_ex.substring(prefix.length).trim();
        break;
      }
      // 前缀直接接大写字母的情况
      if (cleaned_ex.toLowerCase().startsWith(prefix.toLowerCase()) && 
          cleaned_ex.length > prefix.length &&
          /[A-Z]/.test(cleaned_ex[prefix.length])) {
        cleaned_ex = cleaned_ex.substring(prefix.length).trim();
        break;
      }
    }
    
    // 去掉开头的引号
    cleaned_ex = cleaned_ex.replace(/^["\u201c\u201d''']\s*/, '');
    
    // 去掉 "1 like" → "I like"
    if (cleaned_ex.startsWith('1 like ')) {
      cleaned_ex = 'I like ' + cleaned_ex.substring(7);
    }
    
    // 修正 "Iam" → "I am"
    cleaned_ex = cleaned_ex.replace(/^Iam\b/, 'I am');
    
    // 修正 "toa dentist" → "to a dentist"
    cleaned_ex = cleaned_ex.replace(/toa\s/g, 'to a ');
    
    // 修正 "Pm the" → "I'm the"
    cleaned_ex = cleaned_ex.replace(/^Pm\s/, "I'm ");
    
    // 去掉 "T like" → "I like"
    cleaned_ex = cleaned_ex.replace(/^T like\b/, 'I like');
    
    // 提取英文部分（去掉中文乱码）
    const engMatch = cleaned_ex.match(/^([^.!?]*[.!?])\s*(.*)$/);
    if (engMatch) {
      const english = engMatch[1].trim();
      const chinese = engMatch[2].trim();
      
      // 如果中文部分是乱码
      const chineseIsGarbage = chinese && !/[\u4e00-\u9fa5]/.test(chinese) && /[A-Z]{2,}/.test(chinese);
      
      if (chineseIsGarbage) {
        cleaned_ex = english;
      } else if (chinese && !/[\u4e00-\u9fa5]/.test(chinese)) {
        // 中文部分不是中文也不是正常英文，是乱码
        if (/[A-Z]{2,}|#|\d{2,}/.test(chinese)) {
          cleaned_ex = english;
        }
      }
    }
    
    if (cleaned_ex !== ex) {
      cleaned++;
      console.log(`[${word.word}] "${ex.substring(0, 60)}..." → "${cleaned_ex.substring(0, 80)}"`);
    }
    
    newExamples.push(cleaned_ex);
  }
  
  word.examples = newExamples;
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');
console.log(`\n清理: ${cleaned} 个`);
