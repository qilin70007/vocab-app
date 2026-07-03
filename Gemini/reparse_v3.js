const fs = require('fs');
const path = require('path');

const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();

let allText = '';
files.forEach(f => {
  allText += fs.readFileSync(path.join(ocrDir, f), 'utf8') + '\n';
});

// 策略：在全文中搜索所有 "数字. 后面跟着英文单词" 的模式
// 但要避免误匹配页码、日期等
// 关键条件：
// 1. 数字在1-1785范围内
// 2. 数字后跟 . 或 ) 
// 3. 后面允许有引号、星号等标记
// 4. 然后是一个英文单词（至少2个字母，或者就是a/I）
// 5. 单词后面应该有音标符号 / 或词性标记或空格+小写字母

const entryRegex = /(\d{1,4})[.)]\s*["'""\*\.\u201c\u201d]*\s*([a-zA-Z][a-zA-Z\-']{0,30})(?:\s*\/|\s+(?:n|v|adj|adv|prep|conj|pron|art|num|aux|abbr|int|vt|vi|modal)\b|\s)/g;

let matches = [];
let m;
while ((m = entryRegex.exec(allText)) !== null) {
  const num = parseInt(m[1]);
  const word = m[2].toLowerCase().trim();
  if (word.length < 1) continue;
  if (num < 1 || num > 1785) continue;
  // 过滤掉明显不是词的
  if (/^\d/.test(word)) continue;
  matches.push({ number: num, word });
}

// 去重，保留第一次
const seen = new Set();
const unique = [];
matches.forEach(x => {
  if (!seen.has(x.number)) {
    seen.add(x.number);
    unique.push(x);
  }
});

// 过滤可疑匹配
const cleaned = unique.filter(x => {
  if (x.word.length <= 1 && x.word !== 'a' && x.word !== 'i') return false;
  return true;
});

cleaned.sort((a, b) => a.number - b.number);

const nums = new Set(cleaned.map(x => x.number));
const missing = [];
for (let i = 1; i <= 1785; i++) {
  if (!nums.has(i)) missing.push(i);
}

console.log('提取词条数:', cleaned.length);
console.log('number范围:', cleaned[0]?.number, '-', cleaned[cleaned.length-1]?.number);
console.log('1-1785范围内缺失:', missing.length, '个');
if (missing.length <= 50) {
  console.log('缺失编号:', missing.join(', '));
} else {
  console.log('前20缺失:', missing.slice(0, 20).join(', '));
  console.log('后20缺失:', missing.slice(-20).join(', '));
}
console.log('---');
console.log('前5个:', cleaned.slice(0, 5).map(x => `${x.number}.${x.word}`).join('  '));
console.log('后5个:', cleaned.slice(-5).map(x => `${x.number}.${x.word}`).join('  '));
console.log('Z开头:', cleaned.filter(x => x.word.startsWith('z')).map(x => `${x.number}.${x.word}`).join('  '));

fs.writeFileSync('ocr_words_v3.json', JSON.stringify(cleaned, null, 2), 'utf8');
console.log('已保存: ocr_words_v3.json');
