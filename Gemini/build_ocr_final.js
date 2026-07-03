const o = require('../ocr_parsed_words.json');
const w = require('../words.json');

// 从words.json建索引
const wMap = {};
w.forEach(x => { wMap[x.word.toLowerCase()] = x; });

// 合并：以OCR为基准，从words.json补充中文释义
const result = o.map(item => {
  const key = item.word.toLowerCase();
  const wItem = wMap[key];
  
  // 音标：优先用words.json的（OCR的音标有识别误差），如果words.json没有就用OCR的
  let phonetic = '';
  if (wItem && wItem.phonetic && wItem.phonetic.trim().length > 0) {
    phonetic = wItem.phonetic;
  } else if (item.phonetic) {
    phonetic = item.phonetic;
  }
  
  // 词性：优先words.json，其次OCR
  let pos = '';
  if (wItem && wItem.pos && wItem.pos.trim().length > 0) {
    pos = wItem.pos;
  } else if (item.pos) {
    pos = item.pos;
  }
  
  // 中文释义：用words.json的
  let meaning = '';
  if (wItem && wItem.meaning) {
    meaning = wItem.meaning;
  }
  
  // 例句：合并两边，去重
  let examples = [];
  if (item.examples && item.examples.length > 0) {
    examples.push(...item.examples);
  }
  if (wItem && wItem.examples && wItem.examples.length > 0) {
    wItem.examples.forEach(ex => {
      // 去掉乱码例句（含大量非ASCII非中文字符的）
      if (!examples.includes(ex)) {
        examples.push(ex);
      }
    });
  }
  // 清理例句：去掉纯乱码的
  examples = examples.filter(ex => {
    // 保留有英文内容的例句
    const english = ex.match(/[a-zA-Z]/g);
    return english && english.length >= 3;
  });
  // 去重
  examples = [...new Set(examples)];
  
  // 词形变化：合并
  let forms = [];
  if (wItem && wItem.forms && wItem.forms.length > 0) {
    forms.push(...wItem.forms.map(f => {
      if (typeof f === 'string') return f;
      if (f.form && f.desc) return `${f.form} ${f.desc}`;
      if (f.form) return f.form;
      return JSON.stringify(f);
    }));
  }
  if (item.forms && item.forms.length > 0) {
    item.forms.forEach(f => {
      if (typeof f === 'string' && !forms.includes(f)) {
        forms.push(f);
      }
    });
  }
  
  // 词组搭配
  let collocations = [];
  if (wItem && wItem.collocations && wItem.collocations.length > 0) {
    collocations = wItem.collocations
      .filter(c => c.eng && c.eng.trim().length > 0)
      .map(c => c.eng);
  }
  if (item.phrases && item.phrases.length > 0) {
    item.phrases.forEach(p => {
      if (typeof p === 'string' && !collocations.includes(p)) {
        collocations.push(p);
      }
    });
  }
  
  return {
    number: item.number,
    word: item.word,
    phonetic: phonetic,
    pos: pos,
    meaning: meaning,
    examples: examples,
    phrases: collocations,
    forms: forms,
    section: item.word.charAt(0).toUpperCase(),
    source: 'ocr_merged'
  };
});

// 验证
let noMeaning = result.filter(x => !x.meaning || x.meaning.trim().length === 0);
let noPhonetic = result.filter(x => !x.phonetic || x.phonetic.trim().length === 0);
let noExamples = result.filter(x => !x.examples || x.examples.length === 0);

console.log('生成结果统计:');
console.log('  总词数:', result.length);
console.log('  无释义:', noMeaning.length);
console.log('  无音标:', noPhonetic.length);
console.log('  无例句:', noExamples.length);
console.log('---');
console.log('前3个样本:');
result.slice(0, 3).forEach(x => console.log(JSON.stringify(x, null, 2)));

// 写入文件
const fs = require('fs');
fs.writeFileSync('../words_ocr_final.json', JSON.stringify(result, null, 2), 'utf8');
console.log('---');
console.log('已写入: words_ocr_final.json');
