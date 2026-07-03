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
      // 如果包含中文，或者当前例句积累了很多字符，说明这是一个完整例句
      if (/[\u4e00-\u9fa5]/.test(e) || currentExample.length > 30) {
        // 修复常见 OCR 错误
        let cleaned = currentExample.trim()
          .replace(/Took!/g, 'Look!')
          .replace(/@!/g, '看！')
          .replace(/KLAR/g, '天上有个气球。')
          .replace(/See\?/g, '看！')
          .replace(/in the sky\./g, 'in the sky. 天上有个气球。');
        cleanExamples.push(cleaned);
        currentExample = '';
      }
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
