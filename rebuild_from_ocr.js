const fs = require('fs');

const ocrData = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/ocr_parsed_words.json', 'utf-8'));
const wordsData = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf-8'));

// 从 OCR 提取并清理例句
function extractCleanExamples(ocrWord) {
  if (!ocrWord.examples || ocrWord.examples.length === 0) return [];
  
  const cleanExamples = [];
  let currentExample = '';
  
  for (const e of ocrWord.examples) {
    if (!e || !e.trim()) continue;
    currentExample += ' ' + e.trim();
    // 如果包含中文，这是一个完整例句
    if (/[\u4e00-\u9fa5]/.test(e)) {
      cleanExamples.push(currentExample.trim());
      currentExample = '';
    }
  }
  
  // 处理没有中文的例句
  if (currentExample.trim()) {
    cleanExamples.push(currentExample.trim());
  }
  
  return cleanExamples;
}

// 特定单词的修复规则
const specificFixes = {
  'balloon': (text) => {
    return text.replace(/See\?\s*/g, '').replace(/Took!/g, 'Look!').replace(/@!/g, '看！').replace(/KLAR/g, '天上有个气球');
  },
  'bad': (text) => {
    // 分割多个例句
    const parts = text.split(/(?=How bad|It’s bad|It’s too bad)/);
    return parts[0]?.trim() || text;
  },
  'bag': (text) => {
    return text.replace(/UA MARIE LET SVR/g, '');
  },
  'bakery': (text) => {
    return text.replace(/& AMA ERK,?/g, '');
  },
  'balance': (text) => {
    return text.replace(/enpus/g, '').replace(/VW BRA FSR EBT Ab AE\.?/g, '');
  },
  'ball': (text) => {
    return text.replace(/2\\3R4F KF!?/g, '这个球真大！');
  },
  'banana': (text) => {
    return text.replace(/2\+ L#iRF A\.?/g, '桌子上有一根香蕉。');
  }
};

// 创建 OCR 映射
const ocrMap = {};
for (const w of ocrData) {
  let examples = extractCleanExamples(w);
  
  // 应用特定修复
  if (specificFixes[w.word]) {
    examples = examples.map(specificFixes[w.word]);
  }
  
  // 清理多余空格
  examples = examples.map(e => e.replace(/\s+/g, ' ').trim()).filter(e => e);
  
  if (examples.length > 0) {
    ocrMap[w.word] = examples;
  }
}

// 替换 words.json
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

// 验证
const checkWords = ['balloon', 'bad', 'bag', 'bakery', 'balance', 'ball', 'banana'];
for (const w of checkWords) {
  const found = wordsData.find(x => x.word === w);
  if (found) {
    console.log(w + ':', JSON.stringify(found.examples[0]).substring(0, 100));
  }
}
