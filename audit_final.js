/**
 * 最终审计 v4 - 修正误报
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

function isOCRGarbage(ex) {
  // 1. 开头是OCR乱码前缀（精确匹配）
  const knownPrefixes = ['Ale', 'ore', 'oreu', 'creus', 'enn', 'ones', 'sexu', 'steus', 'serus', 'sEu', 'S7E', 'S73', 'AMR', 'KARAT', 'SWARM', 'SWB', 'sEu3', 'sTEU', 'STEU', 'SER', 'corUe', 'seeus', 'ooFYe', 'cert', 'cou', 'coe', 'sore', 'oerve', 'orkue', 'crtv3'];
  for (const prefix of knownPrefixes) {
    if (new RegExp('^' + prefix + '[\\s\\?]', 'i').test(ex)) return true;
  }
  
  // 2. 开头是 = - ~ _ — 等符号后跟大写字母
  if (/^[=\-~_—]+\s*[A-Z]/.test(ex) && !/^[=\-~_—]+\s*\d/.test(ex)) {
    // 但 "=-" 后面跟正常英文句子不算乱码
    // 检查去掉符号后是否是正常英文
    const afterSym = ex.replace(/^[=\-~_—]+\s*/, '');
    if (/^[a-z]/.test(afterSym)) return false; // 小写开头，可能是正常文本
    return true;
  }
  
  // 3. 含有 #数字 等OCR残留
  if (/#[\d°]/.test(ex)) return true;
  
  // 4. 含有特殊替换字符
  if (/[\ufffd\u25a1\u25cb]/.test(ex)) return true;
  
  // 5. 以 "n." "v." "adj." 开头（其他单词的字典条目）
  if (/^(n|v|adj|adv|conj|prep|pron|art|num|vt|vi)\.\s+[A-Z]/.test(ex)) return true;
  
  // 6. 以页码开头
  if (/^[=&\s]+\d+/.test(ex)) return true;
  
  // 7. 英文句子后跟大量大写乱码（如 "... team. 49 oA XT ARAN"）
  const engMatch = ex.match(/^[A-Z][^.!?]*[.!?]\s*(.+)$/);
  if (engMatch) {
    const after = engMatch[1].trim();
    // 如果后面部分没有中文，且含有连续大写字母
    if (!/[\u4e00-\u9fa5]/.test(after) && /[A-Z]{3,}/.test(after) && after.length > 5) {
      return true;
    }
  }
  
  return false;
}

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

for (const word of words) {
  const problems = [];
  
  if (!word.phonetic) {
    problems.push({ field: 'phonetic', issue: 'empty', severity: 'warning' });
    report.stats.phonetic_empty++;
  } else if (word.phonetic.startsWith('/') && word.phonetic.endsWith('/')) {
    problems.push({ field: 'phonetic', value: word.phonetic, issue: 'slash_format' });
    report.stats.phonetic_slash++;
  }
  
  if (!word.meaning || word.meaning.trim() === '') {
    problems.push({ field: 'meaning', issue: 'empty' });
    report.stats.meaning_empty++;
  }
  
  if (word.examples && word.examples.length > 0) {
    for (let i = 0; i < word.examples.length; i++) {
      const ex = word.examples[i];
      if (!ex) continue;
      
      if (isOCRGarbage(ex)) {
        problems.push({ field: 'examples', index: i, value: ex, issue: 'garbage' });
        report.stats.example_garbage++;
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

console.log('========== 最终审计报告 v4 ==========');
console.log(`总单词数: ${report.total}`);
console.log(`问题单词数: ${report.issues.length}`);
console.log(`问题率: ${(report.issues.length / report.total * 100).toFixed(1)}%`);
console.log('\n问题分布:');
console.log(`  音标-斜杠格式: ${report.stats.phonetic_slash}`);
console.log(`  音标-空: ${report.stats.phonetic_empty}`);
console.log(`  例句-OCR乱码: ${report.stats.example_garbage}`);
console.log(`  词义-空: ${report.stats.meaning_empty}`);

if (report.issues.length > 0) {
  console.log('\n--- 问题列表 ---');
  report.issues.forEach((item, idx) => {
    console.log(`\n${idx + 1}. ${item.word} - ${item.meaning}`);
    item.problems.forEach(p => {
      let detail = '';
      if (p.value) detail = ` value="${p.value}"`;
      console.log(`   ${p.field}[${p.index !== undefined ? p.index : ''}]: ${p.issue}${detail}`);
    });
  });
}

fs.writeFileSync('E:\\Tina\\自研背单词软件\\audit_report_final.json', JSON.stringify(report, null, 2), 'utf-8');
console.log('\n完整报告已保存到: audit_report_final.json');
