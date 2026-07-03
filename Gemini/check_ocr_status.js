const o = require('../ocr_parsed_words.json');

// 统计需要补的内容
let needDef = o.filter(x => {
  // definition全乱码：没有可读中文
  const chinese = x.definition.match(/[\u4e00-\u9fff]/g);
  return !chinese || chinese.length < 2;
});
let needPhonetic = o.filter(x => !x.phonetic || x.phonetic.trim().length < 2);
let needExamples = o.filter(x => !x.examples || x.examples.length === 0);

console.log('OCR总词数:', o.length);
console.log('需要补中文释义:', needDef.length);
console.log('音标OK:', o.length - needPhonetic.length, '需补:', needPhonetic.length);
console.log('有例句:', o.length - needExamples.length, '需补:', needExamples.length);
console.log('---');

// 看看英文部分质量
console.log('前10个词的英文信息质量:');
o.slice(0, 10).forEach(x => {
  console.log(`  ${x.number}. ${x.word} | phonetic: ${x.phonetic} | pos: ${x.pos} | def: "${x.definition}"`);
  if (x.examples && x.examples.length > 0) {
    console.log(`    例句: ${x.examples[0].substring(0, 80)}`);
  }
});
console.log('---');

// 看看OCR的number范围和实际词汇
console.log('词汇列表(每50个):');
for (let i = 0; i < o.length; i += 50) {
  const batch = o.slice(i, i + 50);
  console.log(`  ${batch[0].number}-${batch[batch.length-1].number}: ${batch[0].word} ... ${batch[batch.length-1].word}`);
}
