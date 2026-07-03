const fs = require('fs');
const path = require('path');

const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();

// 从page_0008开始（第8页才是词汇内容）
const startIdx = files.findIndex(f => f === 'page_0008.txt');
const vocabFiles = files.slice(startIdx);

let allText = '';
vocabFiles.forEach(f => {
  allText += fs.readFileSync(path.join(ocrDir, f), 'utf8') + '\n';
});

// 用宽松正则提取
const entryRegex = /(?:^|\n)(\d{1,4})[.)、]\s*["'""\*\.\u201c\u201d]*\s*([a-zA-Z][a-zA-Z\-']{0,30})/g;

let matches = [];
let m;
while ((m = entryRegex.exec(allText)) !== null) {
  const num = parseInt(m[1]);
  const word = m[2].toLowerCase().trim();
  if (word.length < 1) continue;
  if (num < 1 || num > 2000) continue;
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

// 去掉可疑匹配（单字母，数字开头的词）
const cleaned = unique.filter(x => {
  if (x.word.length <= 1 && x.word !== 'a' && x.word !== 'i') return false;
  // 去掉包含数字的
  if (/\d/.test(x.word)) return false;
  return true;
});

cleaned.sort((a, b) => a.number - b.number);

const nums = new Set(cleaned.map(x => x.number));
// 根据实际范围判断：应该是1到某个最大number
const maxExpected = 1800;
const missing = [];
for (let i = 1; i <= maxExpected; i++) {
  if (!nums.has(i)) missing.push(i);
}

console.log('从page_0008起提取词条数:', cleaned.length);
console.log('number范围:', cleaned[0]?.number, '-', cleaned[cleaned.length-1]?.number);
console.log('1-1785范围内缺失:', missing.filter(n => n <= 1785).length, '个');
console.log('缺失编号:', missing.filter(n => n <= 1785).join(', '));
console.log('---');
console.log('第一个词:', cleaned[0]?.number, cleaned[0]?.word);
console.log('前5个:', cleaned.slice(0, 5).map(x => `${x.number}.${x.word}`).join('  '));
console.log('---');
console.log('最后5个:', cleaned.slice(-5).map(x => `${x.number}.${x.word}`).join('  '));
console.log('Z开头:', cleaned.filter(x => x.word.startsWith('z')).map(x => `${x.number}.${x.word}`).join('  '));

// 保存
fs.writeFileSync('ocr_words_v2.json', JSON.stringify(cleaned, null, 2), 'utf8');
console.log('已保存: ocr_words_v2.json');
