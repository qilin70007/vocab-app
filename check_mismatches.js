const fs = require('fs');
const path = 'E:/Tina/自研背单词软件/words.json';
const data = JSON.parse(fs.readFileSync(path, 'utf-8'));

// 检查每个词的搭配是否跟词本身相关
const issues = [];
for (const w of data) {
  if (!w.collocations || w.collocations.length === 0) continue;
  
  const word = w.word.toLowerCase().trim();
  for (const coll of w.collocations) {
    // 跳过含乱码的搭配
    if (coll.match(/^(cs |oS |ik |oe |ee |me |wT |v$|eT |ce )/)) continue;
    
    // 检查搭配是否包含乱码字符
    if (coll.match(/[\uFFFD\u{E000}-\u{F8FF}]/u) || coll.match(/RAMEZ|MRRP|ERRAAL|FEEMED/)) {
      issues.push({ num: w.number, word: w.word, issue: 'garbled', coll });
      continue;
    }
    
    // 检查搭配是否跟词有关 - 对于明显不匹配的
    const collLower = coll.toLowerCase();
    // 如果搭配中不包含词本身，且搭配看起来是另一个词的搭配
    // 这个检查比较宽松，只标记明显错误的
  }
}

// 检查特定已知错误
const suspectNums = [1200, 1500, 1785];
for (const num of suspectNums) {
  const w = data.find(d => d.number === num);
  if (w) {
    console.log(`num=${num} word=${w.word} colls=${JSON.stringify(w.collocations)}`);
  }
}

// 找所有搭配跟词不匹配的
console.log('\n--- Checking all words for mismatched collocations ---');
let mismatchCount = 0;
for (const w of data) {
  if (!w.collocations || w.collocations.length === 0) continue;
  const word = w.word.toLowerCase().replace(/[^a-z]/g, '');
  
  for (const coll of w.collocations) {
    const collLower = coll.toLowerCase();
    // 检查搭配是否完全不含这个词
    if (word.length > 2 && !collLower.includes(word) && !collLower.includes(word.slice(0, -1))) {
      // 检查是否是乱码
      if (coll.match(/[^\x00-\x7F\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]{3,}/)) {
        console.log(`GARBLED: num=${w.number} word=${w.word} coll="${coll}"`);
        mismatchCount++;
      }
    }
  }
}
console.log(`\nTotal garbled: ${mismatchCount}`);
