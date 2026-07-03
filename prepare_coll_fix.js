const fs = require('fs');
const data = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf-8'));

// 收集所有需要修复搭配的词
const needsFix = new Set();

// 1. 搭配含真正乱码的
for (const w of data) {
  if (!w.collocations || w.collocations.length === 0) continue;
  for (const c of w.collocations) {
    let hasGarbled = false;
    for (let i = 0; i < c.length; i++) {
      const code = c.charCodeAt(i);
      if (code < 32 && code !== 10 && code !== 13) { hasGarbled = true; break; }
      if (code > 126 && code < 0x2018) { hasGarbled = true; break; }
      if (code > 0x2026 && code < 0x3000) { hasGarbled = true; break; }
      if (code > 0x9fff && code < 0xff00) { hasGarbled = true; break; }
      if (code > 0xffef) { hasGarbled = true; break; }
    }
    if (hasGarbled) {
      needsFix.add(w.number);
      break;
    }
  }
}

// 2. 搭配跟词完全不匹配的 (word length >= 3)
const skipWords = new Set(['the','and','for','but','not','all','any','can','may','use','try','set','let','put','get','see','say','way','own','too','top','per','off','out','nor','now','new','old','big','low','red','bad','bit','add','age','air','arm','art','bar','bed','box','bus','buy','cup','cut','dad','day','die','dry','eat','end','eye','far','fit','fix','fly','fog','fun','gun','hat','hen','hit','hot','ice','ink','inn','jam','job','joy','key','kid','lab','law','leg','lie','lot','man','map','mix','mom','mud','net','nut','oil','our','owl','pad','pal','pan','pat','pay','pet','pie','pig','pin','pop','pot','pro','raw','ray','rib','rid','rod','row','run','sad','sea','see','sir','sit','six','ski','sky','son','sow','spy','sum','sun','tag','tap','tax','tea','ten','tie','tin','tip','toe','ton','toy','two','use','van','war','web','wet','who','why','win','won','yet','you','zoo','his','her','she','him','its','one','two','six','ten','may','sir','mad','mrs','yes','no','so','as','at','be','by','do','go','he','if','in','is','it','me','my','no','of','oh','ok','on','or','to','up','us','we','an','am','a','i']);

for (const w of data) {
  if (!w.collocations || w.collocations.length === 0) continue;
  const word = w.word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length < 3 || skipWords.has(word)) continue;
  
  const allColls = w.collocations.join(' ').toLowerCase();
  const hasMatch = allColls.includes(word) || allColls.includes(word.slice(0, -1)) || 
                   (word.length > 4 && allColls.includes(word.slice(0, 4)));
  
  if (!hasMatch) {
    needsFix.add(w.number);
  }
}

// 3. 还要检查之前我错误赋值的（num=1200 pool, num=1500 steam等）
// 这些已经被上面的检查覆盖了

const fixList = Array.from(needsFix).sort((a, b) => a - b);
console.log('Total words needing collocation fix: ' + fixList.length);

// 输出需要修复的词的信息
const wordsToFix = fixList.map(num => {
  const w = data.find(d => d.number === num);
  return { num, word: w.word, pos: w.pos, meaning: w.meaning };
});

// 分批，每批50个
const batches = [];
for (let i = 0; i < wordsToFix.length; i += 50) {
  batches.push(wordsToFix.slice(i, i + 50));
}

console.log('Batches: ' + batches.length);
batches.forEach((batch, i) => {
  console.log(`\n--- Batch ${i + 1} (${batch.length} words) ---`);
  batch.forEach(w => console.log(`  ${w.num}|${w.word}|${w.pos}|${w.meaning}`));
});

// 保存批次信息
fs.writeFileSync('E:/Tina/自研背单词软件/coll_fix_batches.json', JSON.stringify(batches, null, 2), 'utf-8');
console.log('\nSaved batches to coll_fix_batches.json');
