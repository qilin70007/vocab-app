// 全面检查 words.json 的一致性问题
// 对照 pdf_pages 中的 PDF 原始页面图片
const fs = require('fs');
const path = require('path');

const words = require('./words.json');

const issues = {
  // 1. 音标问题
  phonetic_missing: [],      // 缺少音标
  phonetic_empty: [],        // 音标为空
  phonetic_bad_format: [],   // 音标格式异常（不含 [ ] 或 / /）
  phonetic_garbage: [],      // 音标含乱码

  // 2. 词性问题
  pos_missing: [],           // 缺少词性
  pos_empty: [],             // 词性为空
  pos_bad: [],               // 词性异常

  // 3. 词义问题
  meaning_missing: [],       // 缺少词义
  meaning_empty: [],         // 词义为空
  meaning_garbage: [],       // 词义含乱码
  meaning_placeholder: [],   // 词义只是占位符（如 & 或单个符号）

  // 4. 变形(forms)问题
  forms_garbage: [],         // 变形含乱码
  forms_bad: [],             // 变形格式异常

  // 5. 搭配(collocations)问题
  coll_garbage: [],          // 搭配含乱码
  coll_bad: [],              // 搭配格式异常
  coll_placeholder: [],      // 搭配是占位符（如 "cs TBP"）
  coll_missing_word: [],     // 搭配缺少对应单词

  // 6. 例句问题
  examples_missing: [],      // 缺少例句
  examples_empty: [],        // 例句为空数组
  examples_no_chinese: [],   // 例句缺少中文翻译
  examples_garbage: [],      // 例句含乱码
  examples_partial_garbage: [], // 例句部分含乱码

  // 7. 其他
  word_missing: [],          // 缺少单词
  duplicate_words: [],       // 重复单词
};

// 乱码检测正则：非ASCII非中文非常用标点
const garbageRegex = /[\uFFFD\u25A0\u25CB\u25CF\u25B2\u25BC\u2610\u2611\u2612]|[a-zA-Z]{20,}|^\W+$/;
// 中文字符范围
const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf]/;
// 大量连续非中文非英文字符（疑似OCR乱码）
const ocrGarbageRegex = /[^\x00-\x7F\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef\u2010-\u2027\u2030-\u205e]{5,}/;
// 仅符号
const symbolOnlyRegex = /^[\s\&\-\—\.\,\;\:\?\!\(\)\[\]\/\\'"]+$/;

const validPos = ['n.', 'v.', 'adj.', 'adv.', 'prep.', 'conj.', 'pron.', 'art.', 'num.', 'int.', 'aux.', 'modal v.', 'vt.', 'vi.', 'link v.', 'n./v.', 'adj./adv.', 'v./n.', 'det.'];

const wordMap = {};
const seenWords = {};

words.forEach((entry, i) => {
  const idx = i;
  const num = entry.number || idx + 1;
  const w = entry.word || '';

  // 检查重复
  const lowerW = w.toLowerCase().trim();
  if (lowerW) {
    if (seenWords[lowerW]) {
      issues.duplicate_words.push({ num, word: w, firstNum: seenWords[lowerW] });
    } else {
      seenWords[lowerW] = num;
    }
  }

  // 检查 word
  if (!w) {
    issues.word_missing.push({ num, idx });
  }

  // 检查音标
  const ph = entry.phonetic || '';
  if (!entry.phonetic) {
    issues.phonetic_missing.push({ num, word: w });
  } else if (ph.trim() === '' || ph.trim() === '[]' || ph.trim() === '/') {
    issues.phonetic_empty.push({ num, word: w, phonetic: ph });
  } else if (!ph.includes('[') && !ph.includes('/') && !ph.includes('ˈ') && !ph.includes('ɪ') && !ph.includes('ə') && !ph.includes('æ')) {
    issues.phonetic_bad_format.push({ num, word: w, phonetic: ph });
  }
  if (ph && (ph.includes('TBP') || ph.includes('SR') || ph.includes('Zak') || ph.match(/^[a-z]{2,3}$/))) {
    issues.phonetic_garbage.push({ num, word: w, phonetic: ph });
  }

  // 检查词性
  const pos = entry.pos || '';
  if (!entry.pos) {
    issues.pos_missing.push({ num, word: w });
  } else if (pos.trim() === '') {
    issues.pos_empty.push({ num, word: w, pos: pos });
  } else if (!validPos.some(v => pos.includes(v)) && pos !== '&') {
    issues.pos_bad.push({ num, word: w, pos: pos });
  }

  // 检查词义
  const meaning = entry.meaning || '';
  if (!entry.meaning) {
    issues.meaning_missing.push({ num, word: w });
  } else if (meaning.trim() === '') {
    issues.meaning_empty.push({ num, word: w, meaning: meaning });
  } else if (meaning === '&' || symbolOnlyRegex.test(meaning.trim())) {
    issues.meaning_placeholder.push({ num, word: w, meaning: meaning });
  }
  if (meaning && ocrGarbageRegex.test(meaning)) {
    issues.meaning_garbage.push({ num, word: w, meaning: meaning });
  }

  // 检查 forms
  if (entry.forms && Array.isArray(entry.forms)) {
    entry.forms.forEach((f, fi) => {
      const fs = String(f || '');
      if (ocrGarbageRegex.test(fs) || (fs.includes('SR') && fs.includes('Zak')) || fs.includes('TBP')) {
        issues.forms_garbage.push({ num, word: w, form: fs, formIdx: fi });
      }
      // forms 应该包含词性标注或变形词
      if (fs && !chineseRegex.test(fs) && !/[a-zA-Z]/.test(fs)) {
        issues.forms_bad.push({ num, word: w, form: fs, formIdx: fi });
      }
    });
  }

  // 检查 collocations
  if (entry.collocations && Array.isArray(entry.collocations)) {
    entry.collocations.forEach((c, ci) => {
      const cs = String(c || '');
      if (cs === 'cs TBP' || cs.trim() === '' || cs === 'TBP') {
        issues.coll_placeholder.push({ num, word: w, coll: cs, collIdx: ci });
      }
      if (ocrGarbageRegex.test(cs)) {
        issues.coll_garbage.push({ num, word: w, coll: cs, collIdx: ci });
      }
      // 搭配应该包含中文或英文单词
      if (cs && !chineseRegex.test(cs) && !/[a-zA-Z]{3,}/.test(cs)) {
        issues.coll_bad.push({ num, word: w, coll: cs, collIdx: ci });
      }
    });
  }

  // 检查 examples
  if (!entry.examples || !Array.isArray(entry.examples)) {
    issues.examples_missing.push({ num, word: w });
  } else if (entry.examples.length === 0) {
    issues.examples_empty.push({ num, word: w });
  } else {
    entry.examples.forEach((ex, ei) => {
      const exs = String(ex || '');
      // 检查是否有中文翻译
      if (!chineseRegex.test(exs)) {
        // 没有中文
        issues.examples_no_chinese.push({ num, word: w, example: exs, exIdx: ei });
      }
      // 检查乱码
      if (ocrGarbageRegex.test(exs) || exs.includes('TBP') || exs.includes('ooEU4') || exs.includes('ix %')) {
        issues.examples_garbage.push({ num, word: w, example: exs, exIdx: ei });
      } else if (/[^\x00-\x7F\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef\u2010-\u2027\u2030-\u205e]{3,}/.test(exs)) {
        issues.examples_partial_garbage.push({ num, word: w, example: exs, exIdx: ei });
      }
    });
  }
});

// 汇总统计
const summary = {};
for (const [key, val] of Object.entries(issues)) {
  summary[key] = val.length;
}

console.log('=== 检查结果汇总 ===');
console.log(JSON.stringify(summary, null, 2));
console.log('\n=== 详细问题 ===\n');

// 输出详细问题
for (const [key, val] of Object.entries(issues)) {
  if (val.length > 0) {
    console.log(`\n--- ${key} (${val.length}) ---`);
    val.slice(0, 30).forEach(v => console.log(JSON.stringify(v)));
    if (val.length > 30) console.log(`... 还有 ${val.length - 30} 条`);
  }
}

// 写入完整报告
fs.writeFileSync('full_check_report.json', JSON.stringify(issues, null, 2), 'utf-8');
console.log('\n完整报告已写入 full_check_report.json');
