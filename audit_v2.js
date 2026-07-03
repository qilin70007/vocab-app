/**
 * 审计当前 words.json - 针对 {eng, chn} 搭配格式
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

const report = {
  total: words.length,
  issues: [],
  stats: {
    phonetic_slash: 0,
    phonetic_garbage: 0,
    phonetic_empty: 0,
    coll_eng_starts_with_word: 0,
    coll_eng_garbage: 0,
    coll_eng_empty: 0,
    coll_chn_empty: 0,
    example_garbage: 0,
    example_not_contain_word: 0,
    meaning_empty: 0
  }
};

for (const word of words) {
  const problems = [];
  
  // 音标
  if (!word.phonetic) {
    problems.push({ field: 'phonetic', issue: 'empty' });
    report.stats.phonetic_empty++;
  } else if (word.phonetic.includes('/')) {
    problems.push({ field: 'phonetic', value: word.phonetic, issue: 'slash_format' });
    report.stats.phonetic_slash++;
  }
  
  // 词义
  if (!word.meaning || word.meaning.trim() === '') {
    problems.push({ field: 'meaning', issue: 'empty' });
    report.stats.meaning_empty++;
  }
  
  // 搭配
  if (word.collocations && word.collocations.length > 0) {
    for (let i = 0; i < word.collocations.length; i++) {
      const coll = word.collocations[i];
      if (!coll || typeof coll !== 'object') continue;
      
      const eng = coll.eng || '';
      const chn = coll.chn || '';
      const wordLower = word.word.toLowerCase();
      
      // 英文部分以单词开头但不是完整搭配
      if (eng.toLowerCase().startsWith(wordLower) && !eng.toLowerCase().startsWith(wordLower + ' ')) {
        const afterWord = eng.substring(wordLower.length);
        // 检查是否是 "word中文" 被误放到 eng 里的情况
        if (/[\u4e00-\u9fa5]/.test(afterWord)) {
          problems.push({ 
            field: 'collocations', index: i, 
            eng: eng, chn: chn,
            issue: 'eng_starts_with_word_and_has_chinese'
          });
          report.stats.coll_eng_starts_with_word++;
        }
      }
      
      // 英文部分含乱码
      if (/[\?\ufffd\u25a1]/.test(eng)) {
        problems.push({ field: 'collocations', index: i, eng: eng, issue: 'eng_garbage' });
        report.stats.coll_eng_garbage++;
      }
      
      // 英文为空
      if (!eng.trim()) {
        problems.push({ field: 'collocations', index: i, chn: chn, issue: 'eng_empty' });
        report.stats.coll_eng_empty++;
      }
      
      // 中文为空
      if (!chn.trim() && eng.trim()) {
        problems.push({ field: 'collocations', index: i, eng: eng, issue: 'chn_empty' });
        report.stats.coll_chn_empty++;
      }
    }
  }
  
  // 例句
  if (word.examples && word.examples.length > 0) {
    for (let i = 0; i < word.examples.length; i++) {
      const ex = word.examples[i];
      if (!ex) continue;
      
      if (/[\?\ufffd\u25a1]/.test(ex)) {
        problems.push({ field: 'examples', index: i, value: ex, issue: 'garbage' });
        report.stats.example_garbage++;
      } else if (!ex.toLowerCase().includes(word.word.toLowerCase())) {
        // 判断是否是OCR乱码
        const englishPart = ex.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g, '').trim();
        if (/^[A-Z\s\.\,\!\?\-—]+$/.test(englishPart) && englishPart.length > 10) {
          problems.push({ field: 'examples', index: i, value: ex, issue: 'ocr_garbage' });
          report.stats.example_garbage++;
        } else {
          problems.push({ field: 'examples', index: i, value: ex, issue: 'word_not_in_example', severity: 'warning' });
          report.stats.example_not_contain_word++;
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

console.log('========== 审计报告 ==========');
console.log(`总单词数: ${report.total}`);
console.log(`问题单词数: ${report.issues.length}`);
console.log(`问题率: ${(report.issues.length / report.total * 100).toFixed(1)}%`);
console.log('\n问题分布:');
console.log(`  音标-斜杠格式: ${report.stats.phonetic_slash}`);
console.log(`  音标-乱码: ${report.stats.phonetic_garbage}`);
console.log(`  音标-空: ${report.stats.phonetic_empty}`);
console.log(`  搭配-英文以单词开头含中文: ${report.stats.coll_eng_starts_with_word}`);
console.log(`  搭配-英文含乱码: ${report.stats.coll_eng_garbage}`);
console.log(`  搭配-英文为空: ${report.stats.coll_eng_empty}`);
console.log(`  搭配-中文为空: ${report.stats.coll_chn_empty}`);
console.log(`  例句-含乱码/OCR垃圾: ${report.stats.example_garbage}`);
console.log(`  例句-不含单词: ${report.stats.example_not_contain_word}`);
console.log(`  词义-空: ${report.stats.meaning_empty}`);

// 输出前20个有问题的词
console.log('\n========== 问题样本(前20) ==========');
report.issues.slice(0, 20).forEach((item, idx) => {
  console.log(`\n${idx + 1}. ${item.word} - ${item.meaning}`);
  item.problems.forEach(p => {
    const sev = p.severity === 'warning' ? '[警告]' : '[错误]';
    let detail = '';
    if (p.eng !== undefined) detail = ` eng="${p.eng}" chn="${p.chn || ''}"`;
    else if (p.value) detail = ` value="${p.value}"`;
    console.log(`   ${sev} ${p.field}[${p.index !== undefined ? p.index : ''}]: ${p.issue}${detail}`);
  });
});

// 保存
fs.writeFileSync('E:\\Tina\\自研背单词软件\\audit_report_v2.json', JSON.stringify(report, null, 2), 'utf-8');
console.log('\n完整报告已保存到: audit_report_v2.json');
