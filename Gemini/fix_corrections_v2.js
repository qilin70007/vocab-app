// 根据OCR文本确认的实际单词，修正words.json
const fs = require('fs');
const words = require('E:/Tina/自研背单词软件/words.json');

// OCR确认的修正（第二批）
const corrections = {
  31: 'after',       // 不是 at
  56: 'A.M.',        // 不是 be (a.m. 缩写)
  85: 'around',      // 不是 come
  231: 'café',       // 不是 make
  344: 'rubbish',    // 不是 work
};

// 对于编号 40 和 48，需要看OCR更仔细
// 40: OCR文本显示 "40. There is a book on the desk" → 这不是词头，是例句
// 48: OCR文本显示的是封面页内容
// 需要更精确地搜索

// 先看编号40 — 在page_0009中搜索 "40."
const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const p9 = fs.readFileSync(ocrDir + '/page_0009.txt', 'utf8');
// 找所有包含 "40" 的位置
let pos = 0;
while (true) {
  const idx = p9.indexOf('40', pos);
  if (idx < 0) break;
  const ctx = p9.substring(Math.max(0, idx - 5), idx + 80).replace(/\n/g, ' ');
  console.log(`40 at pos ${idx}: "${ctx}"`);
  pos = idx + 1;
}

console.log('---');
// 编号48 — 搜索所有文件
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();
for (const f of files) {
  const content = fs.readFileSync(ocrDir + '/' + f, 'utf8');
  // 搜索 "48." 后面跟英文字母
  const re = /48[.)]\s*["'""\*\.]*\s*([a-zA-Z][a-zA-Z\-']{1,30})/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const ctx = content.substring(m.index, m.index + 80).replace(/\n/g, ' ');
    console.log(`48: ${f} → "${ctx}"`);
  }
}

console.log('---');
// 编号 744 vs 1744 — 看page_0260的完整内容
const p260 = fs.readFileSync(ocrDir + '/page_0260.txt', 'utf8');
// 找 744 和 1744
let idx744 = p260.indexOf('744.');
let idx1744 = p260.indexOf('1744.');
console.log(`744 at pos ${idx744}, 1744 at pos ${idx1744}`);
if (idx744 >= 0) {
  console.log(`744 context: "${p260.substring(idx744, idx744 + 80).replace(/\n/g, ' ')}"`);
}
if (idx1744 >= 0) {
  console.log(`1744 context: "${p260.substring(idx1744, idx1744 + 80).replace(/\n/g, ' ')}"`);
}

console.log('---');
// 编号 842 — 看OCR文本
const p129 = fs.readFileSync(ocrDir + '/page_0129.txt', 'utf8');
idx842 = p129.indexOf('842');
if (idx842 >= 0) {
  console.log(`842 context: "${p129.substring(idx842, idx842 + 120).replace(/\n/g, ' ')}"`);
}

// 编号 1722
const p221 = fs.readFileSync(ocrDir + '/page_0221.txt', 'utf8');
let idx1722 = p221.indexOf('1722');
if (idx1722 >= 0) {
  console.log(`1722 context: "${p221.substring(idx1722, idx1722 + 120).replace(/\n/g, ' ')}"`);
}

// 应用已知修正
let fixed = 0;
words.forEach(x => {
  if (corrections[x.number]) {
    const oldWord = x.word;
    x.word = corrections[x.number];
    console.log(`修正 ${x.number}: ${oldWord} → ${x.word}`);
    fixed++;
  }
});

console.log(`\n共修正 ${fixed} 个词`);

// 检查重复
const wordCount = {};
words.forEach(x => {
  const w = x.word.toLowerCase();
  wordCount[w] = (wordCount[w] || 0) + 1;
});
const dupes = Object.entries(wordCount).filter(([w, c]) => c > 1);
console.log('修正后重复词:', dupes.length === 0 ? '无' : dupes.map(([w,c]) => `${w}(${c}次): ${words.filter(x=>x.word.toLowerCase()===w).map(x=>x.number).join(',')}`).join('; '));

fs.writeFileSync('E:/Tina/自研背单词软件/words.json', JSON.stringify(words, null, 2), 'utf8');
console.log('已写入 words.json');
