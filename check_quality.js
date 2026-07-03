const fs = require('fs');

const ocrData = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/ocr_parsed_words.json', 'utf-8'));
const wordsData = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf-8'));

// 统计 OCR 数据质量
let ocrHasChinese = 0;
let ocrNoChinese = 0;
let ocrNoExamples = 0;

for (const w of ocrData) {
  if (!w.examples || w.examples.length === 0) {
    ocrNoExamples++;
    continue;
  }
  const allText = w.examples.join(' ');
  if (/[\u4e00-\u9fa5]/.test(allText)) {
    ocrHasChinese++;
  } else {
    ocrNoChinese++;
  }
}

console.log('OCR data quality:');
console.log('  Has Chinese:', ocrHasChinese);
console.log('  No Chinese:', ocrNoChinese);
console.log('  No examples:', ocrNoExamples);
console.log('  Total:', ocrData.length);

// 统计 words.json 当前质量
let wordsHasChinese = 0;
let wordsNoChinese = 0;
let wordsNoExamples = 0;

for (const w of wordsData) {
  if (!w.examples || w.examples.length === 0) {
    wordsNoExamples++;
    continue;
  }
  const allText = w.examples.join(' ');
  if (/[\u4e00-\u9fa5]/.test(allText)) {
    wordsHasChinese++;
  } else {
    wordsNoChinese++;
  }
}

console.log('\nWords.json current quality:');
console.log('  Has Chinese:', wordsHasChinese);
console.log('  No Chinese:', wordsNoChinese);
console.log('  No examples:', wordsNoExamples);
console.log('  Total:', wordsData.length);

// 看看 words.json 中那些没有中文翻译的例句
console.log('\nSample words without Chinese in examples:');
let count = 0;
for (const w of wordsData) {
  if (w.examples && w.examples.length > 0) {
    const allText = w.examples.join(' ');
    if (!/[\u4e00-\u9fa5]/.test(allText)) {
      console.log('  ' + w.word + ':', w.examples[0].substring(0, 80));
      count++;
      if (count >= 10) break;
    }
  }
}
