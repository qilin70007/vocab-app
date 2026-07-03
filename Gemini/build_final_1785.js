const fs = require('fs');
const ocrWords = require('./ocr_words_final.json');
const oldWords = require('../words_backup_1908.json');  // 用之前备份的1908词版本

// 从旧词库建索引
const wMap = {};
oldWords.forEach(x => { wMap[x.word.toLowerCase()] = x; });

// 合并
const result = ocrWords.map(item => {
  const key = item.word.toLowerCase();
  const wItem = wMap[key];
  
  // 音标
  let phonetic = '';
  if (wItem && wItem.phonetic && wItem.phonetic.trim().length > 0) {
    phonetic = wItem.phonetic;
  }
  
  // 词性
  let pos = '';
  if (wItem && wItem.pos && wItem.pos.trim().length > 0) {
    pos = wItem.pos;
  }
  
  // 中文释义
  let meaning = '';
  if (wItem && wItem.meaning) {
    meaning = wItem.meaning;
  }
  
  // 词形变化
  let forms = [];
  if (wItem && wItem.forms && wItem.forms.length > 0) {
    forms = wItem.forms.map(f => {
      if (typeof f === 'string') return f;
      if (f.form && f.desc) return `${f.form} ${f.desc}`;
      if (f.form) return f.form;
      return '';
    }).filter(x => x.length > 0);
  }
  
  // 词组搭配
  let collocations = [];
  if (wItem && wItem.collocations && wItem.collocations.length > 0) {
    collocations = wItem.collocations
      .filter(c => c.eng && c.eng.trim().length > 0)
      .map(c => c.eng);
  }
  
  // 例句 - 用旧词库的（OCR的已清理过但有乱码残留）
  let examples = [];
  if (wItem && wItem.examples && wItem.examples.length > 0) {
    examples = wItem.examples.filter(ex => ex && ex.trim().length >= 10);
  }
  
  return {
    number: item.number,
    word: item.word,
    phonetic: phonetic,
    pos: pos,
    meaning: meaning,
    forms: forms,
    collocations: collocations,
    examples: examples,
    section: item.word.charAt(0).toUpperCase(),
    source: 'ocr_1785'
  };
});

// 统计
let noMeaning = result.filter(x => !x.meaning || x.meaning.trim().length === 0);
let noPhonetic = result.filter(x => !x.phonetic || x.phonetic.trim().length === 0);
let noExamples = result.filter(x => !x.examples || x.examples.length === 0);

console.log('最终词库统计:');
console.log('  总词数:', result.length);
console.log('  无释义:', noMeaning.length);
console.log('  无音标:', noPhonetic.length);
console.log('  无例句:', noExamples.length);
if (noMeaning.length > 0) {
  console.log('  无释义的词:', noMeaning.map(x => x.word).join(', '));
}
if (noPhonetic.length > 0) {
  console.log('  无音标的词:', noPhonetic.map(x => x.word).join(', '));
}
console.log('---');
console.log('前3个样本:');
result.slice(0, 3).forEach(x => console.log(JSON.stringify(x, null, 2)));

// 写入
fs.writeFileSync('../words.json', JSON.stringify(result, null, 2), 'utf8');
console.log('---');
console.log('已写入: words.json (1785词)');
