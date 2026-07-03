/**
 * 第八轮 - 清理 — === _ = 等前缀
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let cleaned = 0;
let removed = 0;

for (const word of words) {
  if (!word.examples || word.examples.length === 0) continue;
  
  const wordLower = word.word.toLowerCase();
  const newExamples = [];
  
  for (let i = 0; i < word.examples.length; i++) {
    const ex = word.examples[i];
    if (!ex) continue;
    
    // 清理开头的 — === _ = Ti 等前缀
    let cleaned_ex = ex
      .replace(/^[—\-=_]{2,}\s*/g, '')   // 多个 — === _ -
      .replace(/^[—\-=_]\s+/g, '')        // 单个 — - _ = 后跟空格
      .replace(/^[—\-=_]([A-Z])/g, '$1')  // 单个 — - _ = 直接接大写字母
      .replace(/^Ti\s+/i, '')             // "Ti " 前缀
      .replace(/^P\s+\d+\.\s*/i, '')      // "P 227." 前缀
      .replace(/^===\s*P\s+\d+\.\s*\*\*[^*]+\*\*\s*/i, '') // "=== P 227. **buy /bai/ ...**"
      .trim();
    
    // 提取英文部分（去掉中文乱码）
    const engMatch = cleaned_ex.match(/^([^.!?]*[.!?])\s*(.*)$/);
    if (engMatch) {
      const english = engMatch[1].trim();
      const chinese = engMatch[2].trim();
      
      // 如果中文部分是乱码（无中文字符但有连续大写）
      const chineseIsGarbage = chinese && !/[\u4e00-\u9fa5]/.test(chinese) && /[A-Z]{2,}/.test(chinese);
      
      if (chineseIsGarbage) {
        // 只保留英文部分
        if (english.toLowerCase().includes(wordLower)) {
          newExamples.push(english);
          cleaned++;
          console.log(`[清理] ${word.word}: "${ex.substring(0, 60)}..." → "${english}"`);
        } else {
          removed++;
          console.log(`[删除] ${word.word}: 不含目标词 "${english.substring(0, 60)}"`);
        }
      } else {
        newExamples.push(cleaned_ex);
      }
    } else {
      newExamples.push(cleaned_ex);
    }
  }
  
  word.examples = newExamples;
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');
console.log(`\n清理: ${cleaned}, 删除: ${removed}`);
