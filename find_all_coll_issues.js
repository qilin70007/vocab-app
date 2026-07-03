const fs = require('fs');
const data = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf-8'));

// 找所有有问题的搭配
const issues = [];
for (const w of data) {
  if (!w.collocations || w.collocations.length === 0) continue;
  
  const word = w.word.toLowerCase().replace(/[^a-z]/g, '');
  let hasIssue = false;
  let issueTypes = [];
  
  for (const c of w.collocations) {
    // 检查乱码
    let hasGarbled = false;
    for (let i = 0; i < c.length; i++) {
      const code = c.charCodeAt(i);
      if (code < 32 || (code > 126 && code < 0x4e00) || (code > 0x9fff && code < 0xff00) || code > 0xffef) {
        hasGarbled = true;
        break;
      }
    }
    
    if (hasGarbled) {
      hasIssue = true;
      issueTypes.push('garbled');
      break;
    }
  }
  
  // 检查搭配是否跟词有关
  if (word.length >= 3 && !hasIssue) {
    const hasMatch = w.collocations.some(c => {
      const cl = c.toLowerCase();
      return cl.includes(word) || cl.includes(word.slice(0, -1)) || (word.length > 4 && cl.includes(word.slice(0, 4)));
    });
    
    if (!hasMatch) {
      // 进一步检查：是否所有搭配都跟词无关
      const allUnrelated = w.collocations.every(c => {
        const cl = c.toLowerCase();
        return !cl.includes(word) && !cl.includes(word.slice(0, -1));
      });
      if (allUnrelated) {
        hasIssue = true;
        issueTypes.push('mismatched');
      }
    }
  }
  
  if (hasIssue) {
    issues.push({
      num: w.number,
      word: w.word,
      pos: w.pos,
      meaning: w.meaning,
      collocations: w.collocations
    });
  }
}

console.log('Total issues: ' + issues.length);
console.log('\n--- All problematic words ---');
issues.forEach(i => {
  console.log(`\nnum=${i.num} word=${i.word} pos=${i.pos} meaning=${i.meaning}`);
  i.collocations.forEach((c, idx) => console.log(`  [${idx}] ${c}`));
});

// 写成文件供后续处理
fs.writeFileSync('E:/Tina/自研背单词软件/collocation_issues.json', JSON.stringify(issues, null, 2), 'utf-8');
console.log('\nSaved to collocation_issues.json');
