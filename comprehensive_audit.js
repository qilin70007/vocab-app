// 全面审计 words.json - 对照 pdf_pages 检查一致性
const fs = require('fs');
const path = require('path');

const words = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf8'));
const report = {
  total: words.length,
  issues: {}
};

// 1. 检查音标
const phoneticIssues = [];
words.forEach(w => {
  if (!w.phonetic) phoneticIssues.push({num: w.number, word: w.word, type: 'missing'});
  else if (w.phonetic.trim() === '' || w.phonetic.trim() === '[]') phoneticIssues.push({num: w.number, word: w.word, type: 'empty', value: w.phonetic});
  else if (!/^[\[\/].*[\]\/]$/.test(w.phonetic.trim())) phoneticIssues.push({num: w.number, word: w.word, type: 'bad_format', value: w.phonetic});
  // 检查乱码
  else if (/[\ufffd\ufffd\u0000]/.test(w.phonetic)) phoneticIssues.push({num: w.number, word: w.word, type: 'garbage', value: w.phonetic});
});
report.issues.phonetic = phoneticIssues;

// 2. 检查词性
const posIssues = [];
words.forEach(w => {
  if (!w.pos) posIssues.push({num: w.number, word: w.word, type: 'missing'});
  else if (w.pos.trim() === '') posIssues.push({num: w.number, word: w.word, type: 'empty'});
  else if (w.pos === 'abbr.') posIssues.push({num: w.number, word: w.word, type: 'abbr', value: w.pos});
  // 检查异常词性
  else if (!/^(n|v|adj|adv|prep|pron|conj|art|num|abbr|int|aux|vt|vi|vt\.|vi\.|n\.|v\.|adj\.|adv\.|prep\.|pron\.|conj\.|art\.|num\.|int\.|aux\.)/.test(w.pos)) {
    posIssues.push({num: w.number, word: w.word, type: 'bad', value: w.pos});
  }
});
report.issues.pos = posIssues;

// 3. 检查词义
const meaningIssues = [];
words.forEach(w => {
  if (!w.meaning) meaningIssues.push({num: w.number, word: w.word, type: 'missing'});
  else if (w.meaning.trim() === '') meaningIssues.push({num: w.number, word: w.word, type: 'empty'});
  else if (w.meaning.trim() === '&') meaningIssues.push({num: w.number, word: w.word, type: 'placeholder', value: w.meaning});
  else if (/[\ufffd\ufffd\u0000]/.test(w.meaning)) meaningIssues.push({num: w.number, word: w.word, type: 'garbage', value: w.meaning});
});
report.issues.meaning = meaningIssues;

// 4. 检查变形
const formsIssues = [];
words.forEach(w => {
  if (w.forms && Array.isArray(w.forms)) {
    w.forms.forEach((f, i) => {
      if (/[\ufffd\ufffd\u0000]/.test(f)) formsIssues.push({num: w.number, word: w.word, type: 'garbage', idx: i, value: f});
      // 检查非英文乱码
      else if (/[^a-zA-Z0-9\s\.\,\-\(\)\'\/]/.test(f) && !/[\u4e00-\u9fff]/.test(f)) {
        // 有非英非中的字符，可能是乱码
        if (/[\u00c0-\u00ff\u0100-\u017f]/.test(f)) return; // 跳过扩展拉丁（音标可能含）
        formsIssues.push({num: w.number, word: w.word, type: 'suspicious', idx: i, value: f});
      }
    });
  }
});
report.issues.forms = formsIssues;

// 5. 检查搭配
const collIssues = [];
words.forEach(w => {
  if (w.collocations && Array.isArray(w.collocations)) {
    w.collocations.forEach((c, i) => {
      if (!c || c.trim() === '') { collIssues.push({num: w.number, word: w.word, type: 'empty', idx: i}); return; }
      // 乱码检查 - 含大量非英文非中文非标点的字符
      if (/[\ufffd\ufffd\u0000]/.test(c)) { collIssues.push({num: w.number, word: w.word, type: 'garbage', idx: i, value: c}); return; }
      // 检查是否像 OCR 乱码（短的无意义字母组合）
      if (c.length < 10 && /^[a-z\s]+$/i.test(c) && !/\./.test(c)) {
        // 像 "cs TBP", "oS WB", "v" 这种无意义短串
        const words_in_coll = c.split(/\s+/);
        if (words_in_coll.every(w => w.length <= 4) && !words_in_coll.some(w => w.length > 3)) {
          collIssues.push({num: w.number, word: w.word, type: 'placeholder', idx: i, value: c});
        }
      }
      // 检查含有大量无意义字母片段
      if (/[a-z]{2,}\s+[A-Z]{2,}/.test(c) && !/[.;,]/.test(c) && c.length < 30) {
        collIssues.push({num: w.number, word: w.word, type: 'bad', idx: i, value: c});
      }
    });
  }
});
report.issues.collocations = collIssues;

// 6. 检查例句
const exampleIssues = [];
words.forEach(w => {
  if (!w.examples || !Array.isArray(w.examples) || w.examples.length === 0) {
    exampleIssues.push({num: w.number, word: w.word, type: 'empty'});
    return;
  }
  w.examples.forEach((ex, i) => {
    if (!ex || ex.trim() === '') { exampleIssues.push({num: w.number, word: w.word, type: 'empty', idx: i}); return; }
    // 检查乱码
    if (/[\ufffd\ufffd\u0000]/.test(ex)) { exampleIssues.push({num: w.number, word: w.word, type: 'garbage', idx: i, value: ex.substring(0, 50)}); return; }
    // 检查是否有中文
    const hasChinese = /[\u4e00-\u9fff]/.test(ex);
    if (!hasChinese) {
      exampleIssues.push({num: w.number, word: w.word, type: 'no_chinese', idx: i, value: ex.substring(0, 60)});
    }
    // 检查部分乱码
    if (/[a-z]{2,}\s+[A-Z]{2,}\s+/.test(ex) && !/[\u4e00-\u9fff]/.test(ex.split(/[a-z]{2,}\s+[A-Z]{2,}/)[1] || '')) {
      // 可能含部分乱码
      if (ex.length < 80 && /\b[A-Z]{2,}\b/.test(ex) && !/^(I|A)\b/.test(ex)) {
        exampleIssues.push({num: w.number, word: w.word, type: 'partial_garbage', idx: i, value: ex.substring(0, 60)});
      }
    }
  });
});
report.issues.examples = exampleIssues;

// 7. 检查重复单词
const dupIssues = [];
const wordMap = {};
words.forEach(w => {
  const key = w.word.toLowerCase();
  if (wordMap[key]) {
    dupIssues.push({num: w.number, word: w.word, firstNum: wordMap[key]});
  } else {
    wordMap[key] = w.number;
  }
});
report.issues.duplicates = dupIssues;

// 8. 检查单词本身
const wordIssues = [];
words.forEach(w => {
  if (!w.word || w.word.trim() === '') wordIssues.push({num: w.number, type: 'missing'});
  else if (/[\ufffd\ufffd\u0000]/.test(w.word)) wordIssues.push({num: w.number, word: w.word, type: 'garbage'});
});
report.issues.word = wordIssues;

// 输出汇总
console.log('=== 审计汇总 ===');
console.log('总数:', report.total);
console.log('音标问题:', report.issues.phonetic.length);
console.log('词性问题:', report.issues.pos.length);
console.log('词义问题:', report.issues.meaning.length);
console.log('变形问题:', report.issues.forms.length);
console.log('搭配问题:', report.issues.collocations.length);
console.log('例句问题:', report.issues.examples.length);
console.log('  - 例句为空:', report.issues.examples.filter(e => e.type === 'empty').length);
console.log('  - 无中文:', report.issues.examples.filter(e => e.type === 'no_chinese').length);
console.log('  - 乱码:', report.issues.examples.filter(e => e.type === 'garbage').length);
console.log('  - 部分乱码:', report.issues.examples.filter(e => e.type === 'partial_garbage').length);
console.log('重复单词:', report.issues.duplicates.length);
console.log('单词本身问题:', report.issues.word.length);

// 输出详细问题
const detailPath = 'E:/Tina/自研背单词软件/audit_detail.json';
fs.writeFileSync(detailPath, JSON.stringify(report.issues, null, 2), 'utf8');
console.log('\n详细问题已写入:', detailPath);

// 输出需要修复的问题列表
const fixList = [];
// pos_missing
report.issues.pos.filter(p => p.type === 'missing').forEach(p => {
  fixList.push({num: p.num, word: p.word, field: 'pos', issue: 'missing'});
});
report.issues.pos.filter(p => p.type === 'abbr').forEach(p => {
  fixList.push({num: p.num, word: p.word, field: 'pos', issue: 'abbr', value: p.value});
});
// meaning placeholder
report.issues.meaning.filter(m => m.type === 'placeholder').forEach(m => {
  fixList.push({num: m.num, word: m.word, field: 'meaning', issue: 'placeholder'});
});
// forms garbage
report.issues.forms.forEach(f => {
  fixList.push({num: f.num, word: f.word, field: 'forms', issue: f.type, idx: f.idx, value: f.value});
});
// coll issues
report.issues.collocations.forEach(c => {
  fixList.push({num: c.num, word: c.word, field: 'collocations', issue: c.type, idx: c.idx, value: c.value});
});
// example garbage/partial
report.issues.examples.filter(e => e.type === 'garbage' || e.type === 'partial_garbage').forEach(e => {
  fixList.push({num: e.num, word: e.word, field: 'examples', issue: e.type, idx: e.idx, value: e.value});
});

console.log('\n=== 需要修复的问题 ===');
console.log('总修复项:', fixList.length);
fixList.forEach(f => console.log(JSON.stringify(f)));
