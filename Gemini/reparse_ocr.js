const fs = require('fs');
const path = require('path');

const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();

let allText = '';
files.forEach(f => {
  allText += fs.readFileSync(path.join(ocrDir, f), 'utf8') + '\n';
});

// 用正则提取所有词条：编号 + 单词 + 音标 的模式
// PDF里的格式类似：> 7. accident /'eksidont/n. 释义
// 或者：1. a /ə/ art. 释义
const entryRegex = /(?:^|\n)\s*(?:>?\s*)?(\d{1,4})[.、)]\s*\*?\.?\s*([a-zA-Z][a-zA-Z\-']*)\s*[\/\[]([^\]\/\n]{2,30})[\/\]]/g;

let matches = [];
let m;
while ((m = entryRegex.exec(allText)) !== null) {
  const num = parseInt(m[1]);
  const word = m[2].toLowerCase().trim();
  const phonetic = m[3].trim();
  matches.push({ number: num, word, phonetic });
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
console.log('前20个:');
unique.slice(0, 20).forEach(x => console.log(`  ${x.number}. ${x.word} /${x.phonetic}/`));
console.log('---');
console.log('后20个:');
unique.slice(-20).forEach(x => console.log(`  ${x.number}. ${x.word} /${x.phonetic}/`));
console.log('---');

// 检查Z开头
const z = unique.filter(x => x.word.startsWith('z'));
console.log('Z开头词条:', z.length);
z.forEach(x => console.log(`  ${x.number}. ${x.word}`));

// 检查缺失
const nums = new Set(unique.map(x => x.number));
const minN = unique[0].number;
const maxN = unique[unique.length-1].number;
const missing = [];
for (let i = minN; i <= maxN; i++) {
  if (!nums.has(i)) missing.push(i);
}
console.log('---');
console.log(`范围 ${minN}-${maxN} 内缺失: ${missing.length} 个`);
if (missing.length < 50) console.log(missing.join(', '));
