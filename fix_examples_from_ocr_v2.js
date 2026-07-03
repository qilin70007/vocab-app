const fs = require('fs');

const ocrData = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/ocr_parsed_words.json', 'utf-8'));
const wordsData = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf-8'));

// 创建 OCR 数据的 word->examples 映射
const ocrMap = {};
for (const w of ocrData) {
  if (w.examples && w.examples.length > 0) {
    // 清理 OCR 例句：合并多行、修复常见错误
    const cleanExamples = [];
    let currentExample = '';
    
    for (const e of w.examples) {
      if (!e || !e.trim()) continue;
      currentExample += ' ' + e.trim();
      // 如果包含中文，说明这是一个完整例句
      if (/[\u4e00-\u9fa5]/.test(e)) {
        cleanExamples.push(currentExample.trim());
        currentExample = '';
      }
    }
    
    // 处理没有中文的例句（如 balloon）
    if (currentExample.trim()) {
      let cleaned = currentExample.trim();
      // 修复特定 OCR 错误
      // 修复 balloon 的 OCR 错误
      if (cleaned.includes('balloon')) {
        cleaned = cleaned.replace(/Took!/g, 'Look!');
        cleaned = cleaned.replace(/See\?/g, '');
        cleaned = cleaned.replace(/@!/g, '看！');
        cleaned = cleaned.replace(/KLAR\./g, '天上有个气球。');
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
      }
      cleanExamples.push(cleaned);
    }
    
    if (cleanExamples.length > 0) {
      ocrMap[w.word] = cleanExamples;
    }
  }
}

// 替换 words.json 中的例句
let replacedCount = 0;
for (const w of wordsData) {
  if (ocrMap[w.word]) {
    w.examples = ocrMap[w.word];
    replacedCount++;
  }
}

// 保存
fs.writeFileSync('E:/Tina/自研背单词软件/words.json', JSON.stringify(wordsData, null, 2), 'utf-8');
console.log('Replaced examples for', replacedCount, 'words');
console.log('Total words:', wordsData.length);
console.log('Sample - balloon:', JSON.stringify(ocrMap['balloon']));
