const fs = require('fs');

const data = require('./ocr_words_v4.json');

// 修正误匹配
const fixes = {
  1: 'ability',    // page_0008: "> 1. *ability® /o'biloti/"
  2: 'able',       // page_0008: "> 2. *able /exbl/ adj."
  3: 'about',      // page_0009: "> 3. *about /o'baut/ adv."
  448: 'collocation',  // 根据上下文推断
  1144: 'our',
  1722: 'west',
};

data.forEach(x => {
  if (fixes[x.number]) {
    console.log(`修正 ${x.number}: ${x.word} → ${fixes[x.number]}`);
    x.word = fixes[x.number];
  }
});

// 验证
const nums = new Set(data.map(x => x.number));
const missing = [];
for (let i = 1; i <= 1785; i++) {
  if (!nums.has(i)) missing.push(i);
}

console.log('---');
console.log('最终词条数:', data.length);
console.log('1-1785缺失:', missing.length, '个');
console.log('缺失编号:', missing.join(', '));
console.log('---');
console.log('前10个:', data.slice(0, 10).map(x => `${x.number}.${x.word}`).join('  '));
console.log('后5个:', data.slice(-5).map(x => `${x.number}.${x.word}`).join('  '));
console.log('Z开头:', data.filter(x => x.word.startsWith('z')).map(x => `${x.number}.${x.word}`).join('  '));

// 统计字母分布
const letters = {};
data.forEach(x => {
  const l = x.word.charAt(0).toUpperCase();
  letters[l] = (letters[l] || 0) + 1;
});
console.log('---');
console.log('字母分布:');
Object.keys(letters).sort().forEach(l => console.log(`  ${l}: ${letters[l]}`));

fs.writeFileSync('ocr_words_final.json', JSON.stringify(data, null, 2), 'utf8');
console.log('已保存: ocr_words_final.json');
