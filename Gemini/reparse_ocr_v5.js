const fs = require('fs');
const path = require('path');

const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();

let allText = '';
files.forEach(f => {
  allText += fs.readFileSync(path.join(ocrDir, f), 'utf8') + '\n';
});

// 更宽松的正则：编号. 后面允许任意非字母数字字符（包括空格、引号、星号等），然后是英文单词
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

unique.sort((a, b) => a.number - b.number);

console.log('提取到的词条数:', unique.length);
console.log('number范围:', unique[0]?.number, '-', unique[unique.length-1]?.number);

const nums = new Set(unique.map(x => x.number));
const missing = [];
for (let i = 1; i <= 1785; i++) {
  if (!nums.has(i)) missing.push(i);
}
console.log(`范围 1-1785 内缺失: ${missing.length} 个`);
console.log('缺失编号:', missing.join(', '));

// 对于缺失的编号，尝试在文本中找到它们
if (missing.length > 0) {
  console.log('---');
  console.log('缺失编号搜索:');
  missing.forEach(num => {
    // 搜索编号出现的任何位置
    const re = new RegExp(`${num}[.)、\\.\\s]`, 'g');
    let m2;
    while ((m2 = re.exec(allText)) !== null) {
      const ctx = allText.substring(Math.max(0, m2.index - 5), m2.index + 100).replace(/\n/g, ' ');
      // 看看后面是否有英文单词
      const after = ctx.substring(ctx.indexOf(String(num)) + String(num).length + 1);
      const wordMatch = after.match(/([a-zA-Z][a-zA-Z\-']{1,30})/);
      if (wordMatch) {
        console.log(`  ${num}: "${ctx}" → word: ${wordMatch[1]}`);
      } else {
        console.log(`  ${num}: "${ctx}" → 无英文单词`);
      }
      return;
    }
    console.log(`  ${num}: 完全未找到`);
  });
}

// 输出完整列表的一些统计
console.log('---');
console.log('Z开头:');
unique.filter(x => x.word.startsWith('z')).forEach(x => console.log(`  ${x.number}. ${x.word}`));
console.log('---');
// 检查可能的误匹配（number正确但word明显不对）
const suspicious = unique.filter(x => x.word.length <= 1 || x.word.match(/^\d+$/));
if (suspicious.length > 0) {
  console.log('可疑匹配:');
  suspicious.forEach(x => console.log(`  ${x.number}. "${x.word}"`));
}
