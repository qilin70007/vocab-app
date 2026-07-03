const fs = require('fs');
const path = require('path');

const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();

let allText = '';
files.forEach(f => {
  allText += fs.readFileSync(path.join(ocrDir, f), 'utf8') + '\n';
});

// 放宽正则：编号 + 英文单词（不强制要求音标）
// 格式可能是：
// 1. word /phonetic/ pos. definition
// 1. word pos. definition  (无音标)
// > 1. word /phonetic/ ...
// 1) word /phonetic/
// 等等
const entryRegex = /(?:^|\n)\s*(?:>?\s*)?(\d{1,4})[.)、]\s*\*?\.?\s*([a-zA-Z][a-zA-Z\-']{1,30})/g;

let matches = [];
let m;
while ((m = entryRegex.exec(allText)) !== null) {
  const num = parseInt(m[1]);
  const word = m[2].toLowerCase().trim();
  // 过滤掉明显不是词条的（如纯数字上下文中的编号）
  if (word.length < 1) continue;
  matches.push({ number: num, word });
}

// 去重：同一个number只保留第一次出现
const seen = new Set();
const unique = [];
matches.forEach(x => {
  if (!seen.has(x.number)) {
    seen.add(x.number);
    unique.push(x);
  }
});

// 按number排序
unique.sort((a, b) => a.number - b.number);

console.log('提取到的词条数:', unique.length);
console.log('number范围:', unique[0]?.number, '-', unique[unique.length-1]?.number);
console.log('---');

// 检查缺失
const nums = new Set(unique.map(x => x.number));
const minN = unique[0].number;
const maxN = unique[unique.length-1].number;
const missing = [];
for (let i = minN; i <= maxN; i++) {
  if (!nums.has(i)) missing.push(i);
}
console.log(`范围 ${minN}-${maxN} 内缺失: ${missing.length} 个`);
if (missing.length <= 100) {
  console.log(missing.join(', '));
} else {
  console.log('前50个缺失:', missing.slice(0, 50).join(', '));
  console.log('后50个缺失:', missing.slice(-50).join(', '));
}

console.log('---');
console.log('Z开头:');
unique.filter(x => x.word.startsWith('z')).forEach(x => console.log(`  ${x.number}. ${x.word}`));

// 看看缺失的编号附近的内容，帮助理解为什么没匹配到
if (missing.length > 0) {
  console.log('---');
  console.log('缺失编号附近的OCR文本样本（前5个缺失）:');
  missing.slice(0, 5).forEach(num => {
    // 在原文中搜索这个编号
    const searchRegex = new RegExp(`(?:^|\\n)\\s*(?:>?\\s*)?${num}[.)、]`, 'g');
    let found = false;
    while ((m = searchRegex.exec(allText)) !== null) {
      const context = allText.substring(m.index, m.index + 100).replace(/\n/g, ' ');
      console.log(`  ${num}: "${context}"`);
      found = true;
      break;
    }
    if (!found) {
      // 可能编号在行中间
      const midRegex = new RegExp(`${num}[.)、]\\s*\\*?\\.?\\s*([a-zA-Z])`, 'g');
      while ((m = midRegex.exec(allText)) !== null) {
        const context = allText.substring(Math.max(0, m.index - 10), m.index + 80).replace(/\n/g, ' ');
        console.log(`  ${num} (行中): "${context}"`);
        found = true;
        break;
      }
    }
    if (!found) console.log(`  ${num}: 未找到`);
  });
}
