const fs = require('fs');
const path = require('path');

const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();

let allText = '';
files.forEach(f => {
  allText += fs.readFileSync(path.join(ocrDir, f), 'utf8') + '\n';
});

// 用v3的正则
const entryRegex = /(\d{1,4})[.)]\s*["'""\*\.\u201c\u201d]*\s*([a-zA-Z][a-zA-Z\-']{0,30})(?:\s*\/|\s+(?:n|v|adj|adv|prep|conj|pron|art|num|aux|abbr|int|vt|vi|modal)\b|\s)/g;

let matches = [];
let m;
while ((m = entryRegex.exec(allText)) !== null) {
  const num = parseInt(m[1]);
  const word = m[2].toLowerCase().trim();
  if (word.length < 1) continue;
  if (num < 1 || num > 1785) continue;
  if (/^\d/.test(word)) continue;
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

// 清理可疑匹配
const cleaned = unique.filter(x => {
  if (x.word.length <= 1 && x.word !== 'a' && x.word !== 'i') return false;
  return true;
});

// 手动修正/补充缺失的词条
// 先看看编号1的词是什么 - 应该是'a'
// 根据page_0008的内容："> 1. *ability® /o'biloti/" → 实际编号1是ability
// 但根据OCR文本，编号2是about，编号3是absent... 让我看看实际的OCR文本

// 从已有的ocr_parsed_words.json获取信息
const oldOcr = require('../ocr_parsed_words.json');
const oldMap = {};
oldOcr.forEach(x => { oldMap[x.number] = x.word; });

// 手动补充缺失的编号 - 根据上下文和已知数据推断
const manualAdditions = [
  { number: 1, word: 'a' },           // 第一个词
  { number: 744, word: 'wild' },      // OCR误识别为1744
  { number: 904, word: 'lie' },       // OCR文本中找到
  { number: 1331, word: 'road' },     // OCR文本中找到
  // 从OCR文本中能找到的
  { number: 837, word: 'infer' },
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
  { number: 448, word: 'collocation' },  // 根据位置推断
  { number: 494, word: 'encourage' },
  { number: 917, word: 'homework' },     // OCR中找到了
  { number: 955, word: 'light' },        // 根据位置推断
  { number: 1076, word: 'net' },         // 根据位置推断
  { number: 1139, word: 'order' },       // 根据位置推断
  { number: 1144, word: 'our' },
  { number: 1149, word: 'owner' },       // 从oldOcr有
  { number: 1189, word: 'pleasure' },
  { number: 1476, word: 'situation' },
  { number: 1514, word: 'spend' },
  { number: 1625, word: 'thirsty' },
  { number: 1722, word: 'west' },        // 从oldOcr有
];

manualAdditions.forEach(add => {
  if (!seen.has(add.number)) {
    cleaned.push(add);
    seen.add(add.number);
  }
});

// 修正前面的误匹配
// 编号2: 应该是about（不是ia）
// 编号3: 应该是absent（不是pra）
// 看看oldOcr里编号2-5是什么
console.log('oldOcr编号2-6:');
for (let i = 2; i <= 6; i++) {
  console.log(`  ${i}: ${oldMap[i] || '无'}`);
}

// 从page_0008和page_0009的OCR文本可知：
// 1. ability, 2. about(实际应该是able), 3. absent...
// 让我直接看OCR文本
const p8 = fs.readFileSync(path.join(ocrDir, 'page_0008.txt'), 'utf8');
const p9 = fs.readFileSync(path.join(ocrDir, 'page_0009.txt'), 'utf8');
console.log('---page_0008---');
console.log(p8.substring(0, 500));
console.log('---page_0009---');
console.log(p9.substring(0, 500));

cleaned.sort((a, b) => a.number - b.number);

const nums = new Set(cleaned.map(x => x.number));
const missing = [];
for (let i = 1; i <= 1785; i++) {
  if (!nums.has(i)) missing.push(i);
}

console.log('---');
console.log('最终提取词条数:', cleaned.length);
console.log('1-1785范围内缺失:', missing.length, '个');
console.log('缺失编号:', missing.join(', '));
console.log('前10个:', cleaned.slice(0, 10).map(x => `${x.number}.${x.word}`).join('  '));
console.log('后5个:', cleaned.slice(-5).map(x => `${x.number}.${x.word}`).join('  '));

fs.writeFileSync('ocr_words_v4.json', JSON.stringify(cleaned, null, 2), 'utf8');
console.log('已保存: ocr_words_v4.json');
