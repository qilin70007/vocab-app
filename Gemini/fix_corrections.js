// 根据OCR文本确认的实际单词，修正words.json中的错误
const fs = require('fs');
const words = require('E:/Tina/自研背单词软件/words.json');

// 从OCR文本确认的修正
const corrections = {
  327: 'company',      // 不是 to
  917: 'listen',       // 不是 homework
  955: 'manner',       // 不是 light (实际是 manner(s))
  1076: "o'clock",     // 不是 net
  1139: 'P.E.',        // 不是 order
  1189: 'P.M.',        // 不是 pleasure
  1476: 'south',       // 不是 situation
  1514: 'street',      // 不是 spend
  1625: 'toward',      // 不是 thirsty (实际是 toward(s))
  414: 'day',          // OCR识别为TAY，实际是day
  165: 'bicycle',      // OCR拼写错误 bicyele
  372: 'cry',          // OCR拼写错误 ery
  1334: 'rock',        // OCR拼写错误 reck
};

// 对于编号 217 "bund" — 需要查看OCR文本确认
// 先看看217在哪个OCR文件
const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();
for (const f of files) {
  const content = fs.readFileSync(ocrDir + '/' + f, 'utf8');
  const idx = content.search(/217[.)、]/);
  if (idx >= 0) {
    const ctx = content.substring(Math.max(0, idx - 10), idx + 100).replace(/\n/g, ' ');
    console.log(`217: ${f} → "${ctx}"`);
    break;
  }
}

// 应用修正
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

// 重新检查重复词
const wordCount = {};
words.forEach(x => {
  const w = x.word.toLowerCase();
  wordCount[w] = (wordCount[w] || 0) + 1;
});
const dupes = Object.entries(wordCount).filter(([w, c]) => c > 1);
console.log('\n修正后重复词:', dupes.length === 0 ? '无' : dupes.map(([w,c]) => `${w}(${c}次)`).join(', '));

fs.writeFileSync('E:/Tina/自研背单词软件/words.json', JSON.stringify(words, null, 2), 'utf8');
console.log('已写入 words.json');
