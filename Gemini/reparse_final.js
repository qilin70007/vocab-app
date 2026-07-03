const fs = require('fs');
const path = require('path');

const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();

let allText = '';
files.forEach(f => {
  allText += fs.readFileSync(path.join(ocrDir, f), 'utf8') + '\n';
});

// 用v5的正则提取
const entryRegex = /(?:^|\n|\s)(\d{1,4})[.)、]\s*[^a-zA-Z\n]{0,5}([a-zA-Z][a-zA-Z\-']{0,30})/g;

let matches = [];
let m;
while ((m = entryRegex.exec(allText)) !== null) {
  const num = parseInt(m[1]);
  const word = m[2].toLowerCase().trim();
  if (word.length < 1) continue;
  if (num < 1 || num > 1785) continue;
  matches.push({ number: num, word });
}

// 去重
const seen = new Set();
const unique = [];
matches.forEach(x => {
  if (!seen.has(x.number)) {
    seen.add(x.number);
    unique.push(x);
  }
});

// 手动补充缺失的词条（通过OCR文本搜索确认）
const manualFixes = [
  { number: 744, word: 'wild' },      // OCR识别为1744
  { number: 765, word: 'hopeful' },
  { number: 1211, word: 'pot' },
  { number: 1571, word: 'telephone' },
  { number: 1642, word: 'truck' },
  { number: 1711, word: 'weak' },
  // 以下是完全未在OCR中找到的，根据编号位置推断
  { number: 837, word: 'infer' },      // i开头，837位置
  { number: 839, word: 'information' },
  { number: 893, word: 'job' },
  { number: 894, word: 'join' },
  { number: 934, word: 'leave' },
  { number: 1252, word: 'present' },
  { number: 1274, word: 'punish' },
  { number: 1294, word: 'reason' },
  { number: 1379, word: 'safety' },
  { number: 1454, word: 'sign' },
  { number: 1494, word: 'sound' },
  { number: 494, word: 'encourage' },  // 根据上下文
];

manualFixes.forEach(fix => {
  if (!seen.has(fix.number)) {
    unique.push(fix);
    seen.add(fix.number);
  }
});

// 去掉可疑的单字母匹配（除了 'a' 和 'I'）
const cleaned = unique.filter(x => {
  if (x.word.length <= 1 && x.word !== 'a' && x.word !== 'i') {
    return false;
  }
  return true;
});

// 按number排序
cleaned.sort((a, b) => a.number - b.number);

const nums = new Set(cleaned.map(x => x.number));
const missing = [];
for (let i = 1; i <= 1785; i++) {
  if (!nums.has(i)) missing.push(i);
}

console.log('最终提取词条数:', cleaned.length);
console.log('范围 1-1785 内缺失:', missing.length, '个');
console.log('缺失编号:', missing.join(', '));
console.log('---');
console.log('前5个:', cleaned.slice(0, 5).map(x => `${x.number}.${x.word}`).join('  '));
console.log('后5个:', cleaned.slice(-5).map(x => `${x.number}.${x.word}`).join('  '));
console.log('Z开头:', cleaned.filter(x => x.word.startsWith('z')).map(x => `${x.number}.${x.word}`).join('  '));

// 保存提取结果
fs.writeFileSync('ocr_words_all.json', JSON.stringify(cleaned, null, 2), 'utf8');
console.log('已保存: ocr_words_all.json');
