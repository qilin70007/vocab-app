const fs = require('fs');
const wordsPath = 'E:/Tina/自研背单词软件/words.json';
const words = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

// Manual fixes for the 18 words with double-space meaning issues
const meaningFixes = {
  'adult': 'adj. 成年的；成人的  n. 成年的人或动物',
  'dream': 'n. 梦，梦想  v. 做梦',
  'either': 'adv. 也(用于否定句或否定词组后)  det.&pron. (两者中的)任何一个；两者中的每个',
  'englishwoman': 'n. 英格兰女人',
  'excuse': 'n. 借口  v. 辩解；请原谅',
  'hurry': 'v.&n. 赶快；急忙',
  'matter': 'n. 事情；问题  v. 要紧，有重大关系',
  'middle': 'n. 中间；当中  adj. 中级的',
  'next': 'adv.&prep.&adj. 下一个，最近的；随后；然后',
  'notice': 'n. 布告；通告；注意  v. 注意到',
  'once': 'adv. 一次，一度，从前  conj. 一旦',
  'only': 'adj. 唯一的，仅有的  adv. 仅仅，才',
  'open': 'adj. 开着的，开口的  v. 开，打开',
  'park': 'n. 公园  v. 停放(汽车)',
  'plan': 'n.&v. 计划；打算',
  'plant': 'v. 种植，播种  n. 植物',
  'practice': 'v.(=practise)&n. 练习，实践',
  'uncomfortable': 'adj. 不舒服的；不自在的',
};

let fixCount = 0;
const fixedWords = words.map(w => {
  if (meaningFixes[w.word]) {
    fixCount++;
    return { ...w, meaning: meaningFixes[w.word] };
  }
  return w;
});

console.log('Meanings fixed:', fixCount);
fs.writeFileSync(wordsPath, JSON.stringify(fixedWords, null, 2), 'utf-8');
console.log('Saved!');

// Verify
const verify = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));
const badCount = verify.filter(w => {
  const m = String(w.meaning || '');
  return !m || m.includes('___') || m.includes('  ');
}).length;
console.log('Remaining bad meanings:', badCount);
