const fs = require('fs');
const r = JSON.parse(fs.readFileSync('E:\\Tina\\自研背单词软件\\audit_report_v3.json', 'utf-8'));
const garbage = r.issues.filter(w => w.problems.some(p => p.issue === 'garbage'));

// 分析这些例句的结构
let canSplit = 0;
let cannotSplit = 0;
const samples = [];

for (const w of garbage) {
  const p = w.problems.find(x => x.issue === 'garbage');
  const val = p.value;
  
  // 尝试找到英文例句的结尾（最后一个 . ! ? 后跟空格）
  const match = val.match(/^([A-Z][^。！？]*[.!?])\s*(.*)$/);
  if (match) {
    const english = match[1];
    const chinese = match[2].trim();
    canSplit++;
    if (samples.length < 10) {
      samples.push({ word: w.word, english, chinese: chinese.substring(0, 50) });
    }
  } else {
    cannotSplit++;
  }
}

console.log(`可分割(英文+中文乱码): ${canSplit}`);
console.log(`不可分割: ${cannotSplit}`);
console.log('\n--- 样本 ---');
samples.forEach((s, i) => {
  console.log(`${i + 1}. [${s.word}]`);
  console.log(`   EN: ${s.english}`);
  console.log(`   CN: ${s.chinese}`);
});
