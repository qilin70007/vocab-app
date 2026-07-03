/**
 * 审计 v3 - 更精确的判断
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

const report = {
  total: words.length,
  issues: [],
  stats: {
    phonetic_slash: 0,
    phonetic_empty: 0,
    example_garbage: 0,
    example_not_contain_word: 0,
    example_just_chinese: 0,
    meaning_empty: 0
  }
};

function isOCRGarbage(ex) {
  // 1. 开头是OCR乱码前缀
  if (/^(or|ore|oreu|creus|enn|ones|sexu|steus|serus|sEu|S7E|S73|AMR|KARAT|SWARM|SWB|sEu3|sTEU|STEU|a|SER)[\s\?]/i.test(ex)) {
    return true;
  }
  
  // 2. 前15字符有 "Xxxx[大写]" 格式的乱码词（如 "Se EUs" "S7EUs"）
  const prefix = ex.substring(0, 20).replace(/[\u4e00-\u9fa5]/g, '');
  if (/^[A-Z]{2,4}[a-z]?[A-Z]/.test(prefix) && !/^[A-Z][a-z]+/.test(prefix)) {
    return true;
  }
  
  // 3. 含有 #数字 等OCR残留
  if (/#[\d°]/.test(ex)) return true;
  
  // 4. 含有特殊替换字符
  if (/[\ufffd\u25a1\u25cb]/.test(ex)) return true;
  
  // 5. 含有连续大写乱码（不在词首）
  if (/\s[A-Z]{4,}\s/.test(ex)) return true;
  
  // 6. 以 "n." "v." "adj." 开头（其他单词的字典条目）
  if (/^(n|v|adj|adv|conj|prep|pron|art|num|vt|vi)\.\s+[A-Z]/.test(ex)) return true;
  
  // 7. 以页码开头 "== 数字" "& 数字"
  if (/^[=&\s]+\d+/.test(ex)) return true;
  
  // 8. 纯乱码（短且大写字母占比极高）
  const englishPart = ex.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef（）《》、，。！？：；""''…—\.\,\!\?\:\;\(\)\[\]\-\/]/g, '').trim();
  if (englishPart.length > 3 && englishPart.length < 30) {
    const upperCount = (englishPart.match(/[A-Z]/g) || []).length;
    const lowerCount = (englishPart.match(/[a-z]/g) || []).length;
    if (upperCount > lowerCount * 2 && upperCount > 3) return true;
  }
  
  return false;
}

for (const word of words) {
  const problems = [];
  
  // 音标
  if (!word.phonetic) {
    problems.push({ field: 'phonetic', issue: 'empty', severity: 'warning' });
    report.stats.phonetic_empty++;
  } else if (word.phonetic.startsWith('/') && word.phonetic.endsWith('/')) {
    problems.push({ field: 'phonetic', value: word.phonetic, issue: 'slash_format' });
    report.stats.phonetic_slash++;
  }
  
  // 词义
  if (!word.meaning || word.meaning.trim() === '') {
    problems.push({ field: 'meaning', issue: 'empty' });
    report.stats.meaning_empty++;
  }
  
  // 例句
  if (word.examples && word.examples.length > 0) {
    for (let i = 0; i < word.examples.length; i++) {
      const ex = word.examples[i];
      if (!ex) continue;
      
      if (isOCRGarbage(ex)) {
        problems.push({ field: 'examples', index: i, value: ex, issue: 'garbage' });
        report.stats.example_garbage++;
      } else {
        // 检查是否含目标单词或同根词
        const wordLower = word.word.toLowerCase();
        const exLower = ex.toLowerCase();
        
        // 检查变形
        const variants = [
          wordLower + 's', wordLower + 'es', wordLower + 'ed', wordLower + 'ing',
          wordLower + 'er', wordLower + 'est', wordLower + 'ly',
          wordLower.replace(/y$/, 'ies'), wordLower.replace(/y$/, 'ied'),
          wordLower.replace(/e$/, 'ed'), wordLower.replace(/e$/, 'ing'),
        ];
        let isVariant = exLower.includes(wordLower);
        if (!isVariant) {
          for (const v of variants) {
            if (v.length > 3 && exLower.includes(v)) {
              isVariant = true;
              break;
            }
          }
        }
        // 检查同根词
        if (!isVariant && wordLower.length >= 4) {
          const root = wordLower.substring(0, 4);
          if (exLower.includes(root)) isVariant = true;
        }
        
        if (!isVariant) {
          // 纯中文（不算例句）
          if (/^[\s\u4e00-\u9fa5，。《》！？：；（）—]+$/.test(ex)) {
            problems.push({ field: 'examples', index: i, value: ex, issue: 'just_chinese' });
            report.stats.example_just_chinese++;
          } else {
            problems.push({ field: 'examples', index: i, value: ex, issue: 'word_not_in_example', severity: 'warning' });
            report.stats.example_not_contain_word++;
          }
        }
      }
    }
  }
  
  if (problems.length > 0) {
    report.issues.push({
      number: word.number,
      word: word.word,
      section: word.section,
      meaning: word.meaning,
      problems: problems
    });
  }
}

console.log('========== 审计报告 v3 ==========');
console.log(`总单词数: ${report.total}`);
console.log(`问题单词数: ${report.issues.length}`);
console.log(`问题率: ${(report.issues.length / report.total * 100).toFixed(1)}%`);
console.log('\n问题分布:');
console.log(`  音标-斜杠格式: ${report.stats.phonetic_slash}`);
console.log(`  音标-空: ${report.stats.phonetic_empty}`);
console.log(`  例句-OCR乱码: ${report.stats.example_garbage}`);
console.log(`  例句-不含单词(警告): ${report.stats.example_not_contain_word}`);
console.log(`  例句-纯中文(警告): ${report.stats.example_just_chinese}`);
console.log(`  词义-空: ${report.stats.meaning_empty}`);

fs.writeFileSync('E:\\Tina\\自研背单词软件\\audit_report_v3.json', JSON.stringify(report, null, 2), 'utf-8');
console.log('\n完整报告已保存到: audit_report_v3.json');
