// 找出剩余重复词的编号，以及它们在OCR文本中的实际内容
const fs = require('fs');
const path = require('path');
const words = require('E:/Tina/自研背单词软件/words.json');

// 找重复词及编号
const wordToNums = {};
words.forEach(x => {
  const w = x.word.toLowerCase();
  if (!wordToNums[w]) wordToNums[w] = [];
  wordToNums[w].push(x.number);
});
const dupes = Object.entries(wordToNums).filter(([w, nums]) => nums.length > 1);

// 对每个重复的编号对，在OCR文本中搜索实际内容
const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();

const needCheck = [];
dupes.forEach(([w, nums]) => {
  nums.forEach(num => {
    needCheck.push({ num, word: w });
  });
});

needCheck.forEach(({ num, word }) => {
  // 在OCR文本中搜索这个编号
  let found = false;
  for (const f of files) {
    const content = fs.readFileSync(path.join(ocrDir, f), 'utf8');
    const re = new RegExp(`${num}[.)、]`);
    const idx = content.search(re);
    if (idx >= 0) {
      const ctx = content.substring(Math.max(0, idx), idx + 100).replace(/\n/g, ' ');
      console.log(`${num} (${word}): ${f} → "${ctx}"`);
      found = true;
      break;
    }
  }
  if (!found) {
    console.log(`${num} (${word}): OCR文本未找到`);
  }
});
