const fs = require('fs');
const path = require('path');
const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();

// 搜索 344. 或 344) 后面跟字母（不是1344）
files.forEach(f => {
  const content = fs.readFileSync(path.join(ocrDir, f), 'utf8');
  // 搜索 344 但不是 1344
  const re = /(?<!1)344[.)、]\s*["'""\*\.\u201c\u201d]*\s*[a-zA-Z]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const ctx = content.substring(Math.max(0, m.index - 5), m.index + 80).replace(/\n/g, ' ');
    console.log(`344: ${f} → "${ctx}"`);
  }
});

// 同时搜索 391 和 414
console.log('\n--- 391 ---');
files.forEach(f => {
  const content = fs.readFileSync(path.join(ocrDir, f), 'utf8');
  const re = /(?<!\d)391[.)、]\s*["'""\*\.\u201c\u201d]*\s*[a-zA-Z]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const ctx = content.substring(Math.max(0, m.index - 5), m.index + 80).replace(/\n/g, ' ');
    console.log(`391: ${f} → "${ctx}"`);
  }
});

console.log('\n--- 414 ---');
files.forEach(f => {
  const content = fs.readFileSync(path.join(ocrDir, f), 'utf8');
  const re = /(?<!\d)414[.)、]\s*["'""\*\.\u201c\u201d]*/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const ctx = content.substring(Math.max(0, m.index - 5), m.index + 80).replace(/\n/g, ' ');
    console.log(`414: ${f} → "${ctx}"`);
  }
});
