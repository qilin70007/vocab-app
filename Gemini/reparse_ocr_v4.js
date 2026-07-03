const fs = require('fs');
const path = require('path');

const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();

let allText = '';
files.forEach(f => {
  allText += fs.readFileSync(path.join(ocrDir, f), 'utf8') + '\n';
});

// 策略：找所有 "数字. 后面跟着（可能有引号/星号）一个英文单词" 的模式
// 关键改进：允许编号和单词之间有引号、星号等非字母非数字字符
const entryRegex = /(?:^|\n|\s)(\d{1,4})[.)、]\s*["'""\*\.\u201c\u201d]*\s*([a-zA-Z][a-zA-Z\-']{0,30})/g;

let matches = [];
let m;
while ((m = entryRegex.exec(allText)) !== null) {
  const num = parseInt(m[1]);
  const word = m[2].toLowerCase().trim();
  if (word.length < 1) continue;
  if (num < 1 || num > 1785) continue; // 限制在1-1785范围
  matches.push({ number: num, word });
}

// 去重：同一个number只保留第一次
const seen = new Set();
const unique = [];
matches.forEach(x => {
  if (!seen.has(x.number)) {
    seen.add(x.number);
    unique.push(x);
  }
});

unique.sort((a, b) => a.number - b.number);

console.log('提取到的词条数:', unique.length);
console.log('number范围:', unique[0]?.number, '-', unique[unique.length-1]?.number);

const nums = new Set(unique.map(x => x.number));
const missing = [];
for (let i = 1; i <= 1785; i++) {
  if (!nums.has(i)) missing.push(i);
}
console.log(`范围 1-1785 内缺失: ${missing.length} 个`);

if (missing.length > 0) {
  console.log('缺失编号:', missing.join(', '));
  console.log('---');
  console.log('缺失编号附近文本:');
  missing.slice(0, 15).forEach(num => {
    // 在原文中搜索
    const re = new RegExp(`${num}[.)、]`, 'g');
    let m2;
    let found = false;
    while ((m2 = re.exec(allText)) !== null) {
      const ctx = allText.substring(m2.index, m2.index + 120).replace(/\n/g, ' ');
      console.log(`  ${num}: "${ctx}"`);
      found = true;
      break;
    }
    if (!found) console.log(`  ${num}: 未在文本中找到`);
  });
}
