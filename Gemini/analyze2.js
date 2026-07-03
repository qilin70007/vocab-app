const o = require('../ocr_parsed_words.json');
const w = require('../words.json');

// OCR的number从102开始，说明1-101的单词在OCR里完全缺失
// 看看OCR里有哪些gap
const nums = o.map(x => x.number).sort((a, b) => a - b);
const minNum = nums[0]; // 102
const maxNum = nums[nums.length - 1]; // 1734

// 找出所有缺失的number
const numSet = new Set(nums);
const allMissing = [];
for (let i = minNum; i <= maxNum; i++) {
  if (!numSet.has(i)) allMissing.push(i);
}
console.log(`OCR number范围: ${minNum} - ${maxNum}`);
console.log(`OCR实际解析: ${o.length} 个单词`);
console.log(`范围内应有: ${maxNum - minNum + 1} 个`);
console.log(`缺失: ${allMissing.length} 个`);
console.log('缺失的number:', allMissing.join(','));
console.log('---');

// 检查OCR解析质量 - 看看definition字段是不是乱码
let garbled = o.filter(x => {
  // 中文字符的检测 - 如果definition里基本没有中文，可能是乱码
  const chinese = x.definition.match(/[\u4e00-\u9fff]/g);
  return !chinese || chinese.length < 1;
});
console.log('OCR definition无中文(可能乱码):', garbled.length);
garbled.slice(0, 10).forEach(x => console.log(`  ${x.number} ${x.word}: "${x.definition}"`));
console.log('---');

// 检查words.json里97个空meaning
let emptyMeaning = w.filter(x => !x.meaning || x.meaning.trim().length < 2);
console.log('words.json 空meaning的单词(前20):');
emptyMeaning.slice(0, 20).forEach(x => console.log(`  ${x.word}: meaning="${x.meaning}"`));
console.log('---');

// 看看words.json的结构 vs ocr_parsed_words的结构
console.log('words.json 字段:', Object.keys(w[0]));
console.log('ocr_parsed 字段:', Object.keys(o[0]));
