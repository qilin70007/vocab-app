const fs = require('fs');

const wordsData = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf-8'));

// 清理函数
function cleanExample(text) {
  if (!text) return text;
  
  // 移除纯乱码片段（包含大量特殊字符）
  text = text.replace(/[\u4e00-\u9fa5]*[#@&\\\|\*\^\$\%\!]+[\u4e00-\u9fa5]*/g, '');
  
  // 修复常见 OCR 错误
  text = text.replace(/Took!/g, 'Look!');
  text = text.replace(/See\?\s*/g, '');
  text = text.replace(/@!/g, '看！');
  text = text.replace(/KLAR/g, '天上有个气球');
  text = text.replace(/UA MARIE LET SVR/g, '');
  text = text.replace(/& AMA ERK/g, '');
  text = text.replace(/enpus/g, '');
  text = text.replace(/VW BRA FSR EBT Ab AE/g, '');
  text = text.replace(/2\\3R4F KF/g, '');
  text = text.replace(/2\+ L#iRF A/g, '桌子上有一根香蕉。');
  
  // 清理多余空格
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

// 清理所有例句
let cleanedCount = 0;
for (const w of wordsData) {
  if (w.examples && w.examples.length > 0) {
    w.examples = w.examples.map(cleanExample).filter(e => e && e.trim());
    cleanedCount++;
  }
}

// 保存
fs.writeFileSync('E:/Tina/自研背单词软件/words.json', JSON.stringify(wordsData, null, 2), 'utf-8');
console.log('Cleaned examples for', cleanedCount, 'words');

// 验证 balloon
const balloon = wordsData.find(w => w.word === 'balloon');
console.log('balloon:', JSON.stringify(balloon.examples));
