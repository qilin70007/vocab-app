const fs = require('fs');
const r = JSON.parse(fs.readFileSync('E:\\Tina\\自研背单词软件\\audit_report_v3.json', 'utf-8'));
const garbage = r.issues.filter(w => w.problems.some(p => p.issue === 'garbage'));

let trueGarbage = [];
let falsePos = [];

for (const w of garbage) {
  const p = w.problems.find(x => x.issue === 'garbage');
  const val = p.value;
  
  // 提取英文部分
  const eng = val.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef（）《》、，。！？：；""''…—\.\,\!\?\:\;\(\)\[\]\-\/]/g, '').trim();
  
  // 判断是否真的乱码
  const hasHash = /#\d/.test(val);
  const hasSpecialChar = /[\ufffd\u25a1\u25cb]/.test(val);
  const startsWithGarbage = /^(or|ore|oreu|creus|enn|ones|sexu|steus|serus|sEu|S7E|S73|AMR|KARAT|SWARM|SWB|sEu3|sTEU|STEU|a|SER|=\s|&\s|\d+\.)/i.test(val);
  const upperRun = (eng.match(/[A-Z]{4,}/g) || []);
  const shortAndUpright = eng.length > 3 && eng.length < 25 && (eng.match(/[A-Z]/g) || []).length > (eng.match(/[a-z]/g) || []).length;
  
  if (hasHash || hasSpecialChar || startsWithGarbage || upperRun.length > 0 || shortAndUpright) {
    trueGarbage.push({ word: w.word, val, reasons: { hasHash, hasSpecialChar, startsWithGarbage, upperRun: upperRun.length, shortAndUpright } });
  } else {
    falsePos.push({ word: w.word, val });
  }
}

console.log('========== 误报分析 ==========');
console.log(`总数: ${garbage.length}`);
console.log(`真乱码: ${trueGarbage.length}`);
console.log(`误报(其实正常): ${falsePos.length}`);

console.log('\n--- 误报样本(前20) ---');
falsePos.slice(0, 20).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}] ${f.val.substring(0, 100)}`);
});

console.log('\n--- 真乱码样本(前20) ---');
trueGarbage.slice(0, 20).forEach((f, i) => {
  console.log(`${i + 1}. [${f.word}] ${f.val.substring(0, 100)}`);
  console.log(`   原因: hash=${f.reasons.hasHash} special=${f.reasons.hasSpecialChar} start=${f.reasons.startsWithGarbage} upperRun=${f.reasons.upperRun} short=${f.reasons.shortAndUpright}`);
});
