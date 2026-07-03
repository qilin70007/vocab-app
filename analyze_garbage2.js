const fs = require('fs');
const r = JSON.parse(fs.readFileSync('E:\\Tina\\自研背单词软件\\audit_report_v3.json', 'utf-8'));
const garbage = r.issues.filter(w => w.problems.some(p => p.issue === 'garbage'));

let trueGarbage = [];
let falsePos = [];

for (const w of garbage) {
  const p = w.problems.find(x => x.issue === 'garbage');
  const val = p.value;
  
  // 分离中英文部分
  const chinesePart = val.match(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef（）《》、，。！？：；""''…—]+/g);
  const hasChinese = chinesePart && chinesePart.length > 0;
  
  // 检查英文部分是否真的乱码
  const englishPart = val.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef（）《》、，。！？：；""''…—\.\,\!\?\:\;\(\)\[\]\-\/]/g, '').trim();
  
  // 检查英文部分开头的乱码
  const startsWithGarbage = /^(or|ore|oreu|creus|enn|ones|sexu|steus|serus|sEu|S7E|S73|AMR|KARAT|SWARM|SWB|sEu3|sTEU|STEU|a|SER|=\s|&\s|\d+\.)/i.test(val);
  
  // 英文部分中间是否有真正的乱码（连续大写字母且不是单词）
  // 如 "49 oA XT ARAN" 中的 "oA XT" 是乱码
  const midGarbage = englishPart.match(/\b[A-Z]{2,}[a-z]?\s+[A-Z]{2,}[a-z]?\b/g);
  
  // 含 #数字 等
  const hasHash = /#\d/.test(val);
  
  if (startsWithGarbage || hasHash || (midGarbage && midGarbage.length > 0 && englishPart.length < 100)) {
    trueGarbage.push({ word: w.word, val, start: startsWithGarbage, hash: hasHash, mid: midGarbage });
  } else {
    falsePos.push({ word: w.word, val });
  }
}

console.log('========== 精确分析 ==========');
console.log(`总数: ${garbage.length}`);
console.log(`真乱码: ${trueGarbage.length}`);
console.log(`误报(英文部分正常): ${falsePos.length}`);

console.log('\n--- 误报样本(英文部分正常,只是中文OCR乱码,前30) ---');
falsePos.slice(0, 30).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}] ${f.val.substring(0, 120)}`);
});

console.log('\n--- 真乱码样本(英文部分也有问题,前20) ---');
trueGarbage.slice(0, 20).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}] ${f.val.substring(0, 120)}`);
  console.log(`   原因: start=${f.start} hash=${f.hash} mid=${JSON.stringify(f.mid)}`);
});
