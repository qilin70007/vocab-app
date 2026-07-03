const fs = require('fs');
const words = require('E:/Tina/自研背单词软件/words.json');

// 统计各种缺失情况
let noMeaning = words.filter(x => !x.meaning || x.meaning.trim().length === 0);
let noPhonetic = words.filter(x => !x.phonetic || x.phonetic.trim().length === 0);
let noPos = words.filter(x => !x.pos || x.pos.trim().length === 0);
let noExamples = words.filter(x => !x.examples || x.examples.length === 0);
let noForms = words.filter(x => !x.forms || x.forms.length === 0);

console.log('=== words.json 质量报告 ===');
console.log('总词数:', words.length);
console.log('无释义:', noMeaning.length, noMeaning.map(x=>x.word).join(', '));
console.log('无音标:', noPhonetic.length, noPhonetic.map(x=>x.word).join(', '));
console.log('无词性:', noPos.length);
console.log('无例句:', noExamples.length);
console.log('无词形变化:', noForms.length);

// 检查OCR拼写错误的词
const suspicious = words.filter(x => {
  // 已知的OCR错误
  return ['tay','rarsat','ou','bicyele','ery','bund','reck'].includes(x.word);
});
console.log('\n疑似OCR拼写错误:', suspicious.map(x => `${x.number}.${x.word}`).join(', '));

// 检查重复词
const wordCount = {};
words.forEach(x => {
  const w = x.word.toLowerCase();
  wordCount[w] = (wordCount[w] || 0) + 1;
});
const dupes = Object.entries(wordCount).filter(([w,c]) => c > 1);
console.log('\n重复词:', dupes.length === 0 ? '无' : dupes.map(([w,c]) => `${w}(${c}次)`).join(', '));

// 检查编号连续性
const nums = words.map(x => x.number).sort((a,b) => a-b);
let gaps = [];
for (let i = 1; i <= 1785; i++) {
  if (!nums.includes(i)) gaps.push(i);
}
console.log('\n编号缺失:', gaps.length === 0 ? '无' : gaps.join(', '));

// 检查source字段统计
const sources = {};
words.forEach(x => {
  const s = x.source || 'unknown';
  sources[s] = (sources[s] || 0) + 1;
});
console.log('\n来源统计:', JSON.stringify(sources));

// 输出前5个和后5个
console.log('\n前5个:');
words.slice(0, 5).forEach(x => console.log(`  ${x.number}. ${x.word} ${x.phonetic} ${x.pos} ${x.meaning}`));
console.log('后5个:');
words.slice(-5).forEach(x => console.log(`  ${x.number}. ${x.word} ${x.phonetic} ${x.pos} ${x.meaning}`));
