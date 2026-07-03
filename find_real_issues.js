const fs = require('fs');
const data = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf-8'));

// 找所有有真正乱码的搭配
const garbledIssues = [];
const mismatchIssues = [];

for (const w of data) {
  if (!w.collocations || w.collocations.length === 0) continue;
  
  const word = w.word.toLowerCase().replace(/[^a-z]/g, '');
  
  for (const c of w.collocations) {
    // 检查真正乱码 - 排除中文省略号(…)和常见中文标点
    let hasGarbled = false;
    for (let i = 0; i < c.length; i++) {
      const code = c.charCodeAt(i);
      // 允许: ASCII, 中文(0x4e00-0x9fff), 中文标点(0x3000-0x303f), 全角(0xff00-0xffef)
      // 还允许 … (0x2026), — (0x2014), ' ' " " (0x2018-0x201d)
      if (code < 32 && code !== 10 && code !== 13) { hasGarbled = true; break; }
      if (code > 126 && code < 0x2018) { hasGarbled = true; break; }
      if (code > 0x2026 && code < 0x3000) { hasGarbled = true; break; }
      if (code > 0x9fff && code < 0xff00) { 
        // 允许 0x2018-0x2026 范围已上面处理
        hasGarbled = true; break; 
      }
      if (code > 0xffef) { hasGarbled = true; break; }
    }
    
    if (hasGarbled) {
      garbledIssues.push({ num: w.number, word: w.word, coll: c });
    }
  }
  
  // 检查搭配跟词完全不匹配的情况（仅明显错位的）
  if (word.length >= 3) {
    const allColls = w.collocations.join(' ').toLowerCase();
    // 检查是否有任何搭配包含词根
    const hasMatch = allColls.includes(word) || allColls.includes(word.slice(0, -1)) || 
                     (word.length > 4 && allColls.includes(word.slice(0, 4)));
    
    if (!hasMatch) {
      // 排除一些特殊情况：介词、连词等短词
      const skipWords = ['the', 'and', 'for', 'but', 'not', 'all', 'any', 'can', 'may', 'use', 'try', 'set', 'let', 'put', 'get', 'see', 'say', 'way', 'own', 'too', 'top', 'per', 'off', 'out', 'nor', 'now', 'new', 'old', 'big', 'low', 'red', 'bad', 'bit', 'add', 'age', 'air', 'arm', 'art', 'bar', 'bed', 'box', 'bus', 'buy', 'cup', 'cut', 'dad', 'day', 'die', 'dry', 'eat', 'end', 'eye', 'far', 'fit', 'fix', 'fly', 'fog', 'fun', 'gun', 'hat', 'hen', 'hit', 'hot', 'ice', 'ink', 'inn', 'jam', 'job', 'joy', 'key', 'kid', 'lab', 'law', 'leg', 'lie', 'lot', 'man', 'map', 'mix', 'mom', 'mud', 'net', 'nut', 'oil', 'our', 'owl', 'pad', 'pal', 'pan', 'pat', 'pay', 'pet', 'pie', 'pig', 'pin', 'pop', 'pot', 'pro', 'raw', 'ray', 'rib', 'rid', 'rod', 'row', 'run', 'sad', 'sea', 'see', 'sir', 'sit', 'six', 'ski', 'sky', 'son', 'sow', 'spy', 'sum', 'sun', 'tag', 'tap', 'tax', 'tea', 'ten', 'tie', 'tin', 'tip', 'toe', 'ton', 'toy', 'two', 'use', 'van', 'war', 'web', 'wet', 'who', 'why', 'win', 'won', 'yet', 'you', 'zoo'];
      if (!skipWords.includes(word)) {
        mismatchIssues.push({
          num: w.number,
          word: w.word,
          pos: w.pos,
          meaning: w.meaning,
          collocations: w.collocations
        });
      }
    }
  }
}

console.log('=== 真正乱码的搭配 ===');
console.log('Count: ' + garbledIssues.length);
garbledIssues.forEach(i => console.log(`  num=${i.num} word=${i.word} coll="${i.coll}"`));

console.log('\n=== 搭配跟词完全不匹配 ===');
console.log('Count: ' + mismatchIssues.length);
mismatchIssues.slice(0, 50).forEach(i => {
  console.log(`\n  num=${i.num} word=${i.word} meaning=${i.meaning}`);
  i.collocations.forEach((c, idx) => console.log(`    [${idx}] ${c}`));
});
if (mismatchIssues.length > 50) console.log(`\n  ... and ${mismatchIssues.length - 50} more`);

// 保存需要修复的列表
fs.writeFileSync('E:/Tina/自研背单词软件/garbled_colls.json', JSON.stringify(garbledIssues, null, 2), 'utf-8');
fs.writeFileSync('E:/Tina/自研背单词软件/mismatch_colls.json', JSON.stringify(mismatchIssues, null, 2), 'utf-8');
