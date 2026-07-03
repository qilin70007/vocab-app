/**
 * 第二轮例句清理 - 更激进
 * 
 * 清理：
 * 1. 含有 "?" 或 "?" 替换字符的例句
 * 2. 含有大段乱码的例句（即使有小写字母）
 * 3. 明显是其他单词的字典条目（如 "although / though[ɔ:lˈðəu] conj."）
 * 4. "word / word2[phonetic] pos." 格式的字典条目
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let removed = 0;
const fixes = [];

for (const word of words) {
  if (!word.examples || word.examples.length === 0) continue;
  
  const newExamples = [];
  
  for (const ex of word.examples) {
    if (!ex) continue;
    
    let shouldRemove = false;
    let reason = '';
    
    // 1. 字典条目格式2：word / word2[phonetic] conj.
    if (/^[a-z]+\s*\/\s*[a-z]+\[.*?\]\s*(conj\.|n\.|v\.|adj\.|adv\.)/.test(ex)) {
      shouldRemove = true;
      reason = 'dict_entry_2';
    }
    
    // 2. 含有大量无意义大写字母组合（OCR乱码）
    // 即使有小写字母，如果大写字母占比很高且不含目标单词
    if (!shouldRemove) {
      const wordLower = word.word.toLowerCase();
      const englishPart = ex.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef（）《》、，。！？：；""''…—\.\,\!\?\:\;\(\)\[\]\-\/\d]/g, '').trim();
      
      if (englishPart.length > 10 && !ex.toLowerCase().includes(wordLower)) {
        const upperCount = (englishPart.match(/[A-Z]/g) || []).length;
        const lowerCount = (englishPart.match(/[a-z]/g) || []).length;
        
        // 如果大写字母占主导且总长度大
        if (upperCount > lowerCount * 2 && upperCount > 5) {
          shouldRemove = true;
          reason = 'ocr_garbage_2';
        }
      }
    }
    
    // 3. 例句中包含音标符号 [ə] [ɪ] 等且不含目标单词 → 可能是字典条目
    if (!shouldRemove) {
      const wordLower = word.word.toLowerCase();
      if (!ex.toLowerCase().includes(wordLower) && /\[[əɪɒæʌeɪaɪɔɪaʊɪəeəɑːɪːuːɜːɒæ]/.test(ex)) {
        shouldRemove = true;
        reason = 'dict_with_phonetic';
      }
    }
    
    // 4. "amusement park. 4RPFMABKRABAADNRASAHABRS| AMPMADH, HN" 这种
    if (!shouldRemove) {
      const wordLower = word.word.toLowerCase();
      if (!ex.toLowerCase().includes(wordLower)) {
        // 检查是否有长串大写字母（5个以上连续大写）
        if (/[A-Z]{5,}/.test(ex)) {
          shouldRemove = true;
          reason = 'long_upper_run';
        }
      }
    }
    
    if (shouldRemove) {
      removed++;
      fixes.push({ word: word.word, type: reason, value: ex });
    } else {
      newExamples.push(ex);
    }
  }
  
  word.examples = newExamples;
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');

console.log(`第二轮例句清理: ${removed} 个`);
console.log('\n删除样本(前40):');
fixes.slice(0, 40).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}] ${f.type}: "${f.value.substring(0, 80)}${f.value.length > 80 ? '...' : ''}"`);
});

fs.writeFileSync('E:\\Tina\\自研背单词软件\\fix_examples2_log.json', JSON.stringify(fixes, null, 2), 'utf-8');
