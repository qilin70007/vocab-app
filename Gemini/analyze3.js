const w = require('../words.json');

// 那些"空meaning"其实是长度<2的，但"也""是""和"这些是有效中文
// 重新检查：真正有问题的meaning
let trulyBad = w.filter(x => !x.meaning || x.meaning.trim().length === 0);
let singleChar = w.filter(x => x.meaning && x.meaning.trim().length === 1);
console.log('真正空meaning:', trulyBad.length);
trulyBad.forEach(x => console.log(`  "${x.word}": "${x.meaning}"`));
console.log('---');
console.log('单字符meaning(可能是有效中文):', singleChar.length);
singleChar.slice(0, 10).forEach(x => console.log(`  "${x.word}": "${x.meaning}"`));
console.log('---');

// 看看OCR的definition全是乱码这个事
const o = require('../ocr_parsed_words.json');
// 检查是否有正常中文
let hasChinese = o.filter(x => {
  const m = x.definition.match(/[\u4e00-\u9fff]/g);
  return m && m.length >= 2;
});
console.log('OCR definition有>=2个中文字符的:', hasChinese.length, '/', o.length);
hasChinese.slice(0, 5).forEach(x => console.log(`  ${x.word}: "${x.definition.substring(0, 60)}"`));
