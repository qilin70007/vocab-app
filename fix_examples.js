/**
 * 分析例句问题：
 * 1. 数据错位：例句内容是其他单词的
 * 2. OCR乱码：纯乱码文本
 * 3. 含中文翻译但混入了OCR垃圾
 * 
 * 策略：
 * - 对于明显是其他单词词条的例句（如 advice 下的 "Africa[ˈæfrɪkə] n. 非洲"），删除
 * - 对于纯乱码例句，删除
 * - 对于含单词但格式有问题的，保留
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let removedGarbage = 0;
let removedDictEntry = 0;
let totalExamplesBefore = 0;
let totalExamplesAfter = 0;
const fixes = [];

for (const word of words) {
  if (!word.examples || word.examples.length === 0) continue;
  
  totalExamplesBefore += word.examples.length;
  const newExamples = [];
  
  for (const ex of word.examples) {
    if (!ex) continue;
    
    const wordLower = word.word.toLowerCase();
    
    // 1. 检查是否是字典条目（如 "Africa[ˈæfrɪkə] n. 非洲"）
    // 特征：英文单词+[音标]+词性+中文
    if (/^[A-Z][a-z]+\[.*?\]\s*(n\.|v\.|adj\.|adv\.|conj\.|prep\.|pron\.|art\.|num\.)/.test(ex)) {
      removedDictEntry++;
      fixes.push({ word: word.word, type: 'dict_entry', value: ex });
      continue;
    }
    
    // 2. 检查是否是纯OCR乱码
    // 特征：大量大写字母连在一起，没有有意义的英文单词
    const englishPart = ex.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef（）《》、，。！？：；""''…—]/g, '').trim();
    // 如果英文部分是乱码（大量连续大写字母，没有小写）
    const upperRatio = (englishPart.match(/[A-Z]/g) || []).length / Math.max(englishPart.length, 1);
    const hasLower = /[a-z]/.test(englishPart);
    
    if (englishPart.length > 15 && upperRatio > 0.6 && !hasLower && !ex.toLowerCase().includes(wordLower)) {
      removedGarbage++;
      fixes.push({ word: word.word, type: 'garbage', value: ex });
      continue;
    }
    
    // 3. 检查是否含 "??" 或其他替换字符
    if (/[\ufffd\u25a1]/.test(ex)) {
      removedGarbage++;
      fixes.push({ word: word.word, type: 'garbage_char', value: ex });
      continue;
    }
    
    newExamples.push(ex);
  }
  
  word.examples = newExamples;
  totalExamplesAfter += newExamples.length;
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');

console.log('========== 例句清理结果 ==========');
console.log(`清理前总例句: ${totalExamplesBefore}`);
console.log(`清理后总例句: ${totalExamplesAfter}`);
console.log(`删除OCR乱码: ${removedGarbage}`);
console.log(`删除字典条目: ${removedDictEntry}`);
console.log(`总删除: ${removedGarbage + removedDictEntry}`);

console.log('\n删除样本(前30):');
fixes.slice(0, 30).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}] ${f.type}: "${f.value.substring(0, 80)}${f.value.length > 80 ? '...' : ''}"`);
});

// 保存日志
fs.writeFileSync('E:\\Tina\\自研背单词软件\\fix_examples_log.json', JSON.stringify(fixes, null, 2), 'utf-8');
