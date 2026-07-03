const fs = require('fs');
const path = require('path');

const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();

let allText = '';
files.forEach(f => {
  allText += fs.readFileSync(path.join(ocrDir, f), 'utf8') + '\n';
});

// 更宽松的正则：编号 + 可能的符号 + 英文单词
// 允许编号后跟 . 或 ) 或 、
// 允许编号后跟引号、星号等标记
const entryRegex = /(?:^|\n|\s)\s*(?:>?\s*)?(\d{1,4})[.)、]\s*["'""\*\.]*\s*([a-zA-Z][a-zA-Z\-']{0,30})/g;

let matches = [];
let m;
while ((m = entryRegex.exec(allText)) !== null) {
  const num = parseInt(m[1]);
  const word = m[2].toLowerCase().trim();
  if (word.length < 1) continue;
  // 排除一些明显不是单词的情况（纯数字后面跟的可能是页码等）
  // number应该在合理范围
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

unique.sort((a, b) => a.number - b.number);

console.log('提取到的词条数:', unique.length);
console.log('number范围:', unique[0]?.number, '-', unique[unique.length-1]?.number);

const nums = new Set(unique.map(x => x.number));
const minN = unique[0].number;
const maxN = unique[unique.length-1].number;
const missing = [];
for (let i = minN; i <= maxN; i++) {
  if (!nums.has(i)) missing.push(i);
}
console.log(`范围 ${minN}-${maxN} 内缺失: ${missing.length} 个`);

if (missing.length > 0 && missing.length <= 200) {
  console.log(missing.join(', '));
} else if (missing.length > 200) {
  console.log('前30:', missing.slice(0, 30).join(', '));
  console.log('后30:', missing.slice(-30).join(', '));
}

// 看看缺失编号附近的文本
if (missing.length > 0) {
  console.log('---');
  console.log('缺失编号附近文本（前10个）:');
  missing.slice(0, 10).forEach(num => {
    // 多种模式搜索
    const patterns = [
      new RegExp(` ${num}[.)、]`, 'g'),
      new RegExp(`>${num}[.)、]`, 'g'),
      new RegExp(`\\n${num}[.)、]`, 'g'),
    ];
    for (const re of patterns) {
      re.lastIndex = 0;
      const m2 = re.exec(allText);
      if (m2) {
        const ctx = allText.substring(m2.index, m2.index + 120).replace(/\n/g, ' ');
        console.log(`  ${num}: "${ctx}"`);
        return;
      }
    }
    console.log(`  ${num}: 未找到`);
  });
}
