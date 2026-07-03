const fs = require('fs');
const data = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf-8'));

// 只找真正需要修复的：
// 1. 搭配含乱码字符的
// 2. 搭配明显是其他词的字典条目（如 "dance [dɑːns]v. &n. (C)跳舞"）
// 3. 搭配完全是另一个词的内容（如 chicken 的搭配是各种复数名词）

const realIssues = [];

for (const w of data) {
  if (!w.collocations || w.collocations.length === 0) continue;
  
  let needsFix = false;
  let fixReason = '';
  
  for (const c of w.collocations) {
    // 检查1: 真正乱码字符
    for (let i = 0; i < c.length; i++) {
      const code = c.charCodeAt(i);
      if (code < 32 && code !== 10 && code !== 13) { needsFix = true; fixReason = 'garbled_chars'; break; }
      if (code > 126 && code < 0x2018) { needsFix = true; fixReason = 'garbled_chars'; break; }
      if (code > 0x2026 && code < 0x3000) { needsFix = true; fixReason = 'garbled_chars'; break; }
      if (code > 0x9fff && code < 0xff00) { needsFix = true; fixReason = 'garbled_chars'; break; }
      if (code > 0xffef) { needsFix = true; fixReason = 'garbled_chars'; break; }
    }
    if (needsFix) break;
    
    // 检查2: 搭配是字典条目格式（包含音标 [xxx]）
    if (c.match(/\[[\ʌɑːɪiːeəʊɒæʊɔːaɪeɪˈ]+[^\]]*\]/) && c.match(/n\.\s|v\.\s|adj\.\s|adv\.\s|prep\.\s|pron\.\s/)) {
      // 但排除正常搭配中可能有的词性标注
      if (c.length > 30) {  // 字典条目通常较长
        needsFix = true;
        fixReason = 'dict_entry';
        break;
      }
    }
    
    // 检查3: 搭配完全是无关内容（如例句、其他词的信息）
    // 如果搭配以其他词的音标开头
    if (c.match(/^(keen|keep|key|lady|lamp|land|language|lantern|fool|food|fond|follow|fog|fix|flag|flash|flat|finger|finish|fire|fine|cost|couple|course|cousin|danger|dance|dark|date|death|decide|decorate|degree|delay|deliver|department|dentist|deny|departure|depend|describe|desert|deserve|design|duck|dull|dumpling|during|eat|equal|enter|entrance|envelope|medium|meeting|member|mention|menu|method|metre|middle|mile|mix|model|modern|moment|mouse|movie|narrow|nation|natural|nature|network|never|new|noisy|not|nothing|notice|nose|note|nowadays|number|nurse|offer|office|operate|out|over|oven|page|painting|palace|pale|panda|paper|parent|peach|peace|pear|performance|photo|physical|physics|pick|picnic|picture|pig|pilot|pin|pineapple|pink|place|plan|plane|planet|please|pot|potato|powerful|practice|precious|market|marry|material|maths|matter)\s*\[/)) {
      needsFix = true;
      fixReason = 'wrong_word_entry';
      break;
    }
  }
  
  if (needsFix) {
    realIssues.push({
      num: w.number,
      word: w.word,
      pos: w.pos,
      meaning: w.meaning,
      reason: fixReason,
      collocations: w.collocations
    });
  }
}

console.log('Real issues to fix: ' + realIssues.length);
console.log('\n--- By reason ---');
const byReason = {};
realIssues.forEach(i => { byReason[i.reason] = (byReason[i.reason] || 0) + 1; });
Object.entries(byReason).forEach(([r, c]) => console.log(`  ${r}: ${c}`));

console.log('\n--- Details ---');
realIssues.forEach(i => {
  console.log(`\nnum=${i.num} word=${i.word} reason=${i.reason}`);
  i.collocations.forEach((c, idx) => console.log(`  [${idx}] ${c}`));
});

fs.writeFileSync('E:/Tina/自研背单词软件/real_coll_fixes.json', JSON.stringify(realIssues, null, 2), 'utf-8');
