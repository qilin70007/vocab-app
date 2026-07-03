/**
 * 分类搭配问题
 */

const fs = require('fs');
const words = JSON.parse(fs.readFileSync('E:\\Tina\\自研背单词软件\\words.json', 'utf-8'));

const categories = {
  '单词+中文(短)': [],      // 单词+直接中文，中间无空格
  '单词+空格+中文': [],      // 单词+空格+中文
  '单词重复+中文': [],       // adultadult、accidentt等
  '单词+页码+中文': [],     // 含 "1 of 90" 等页码
  '单词+其他词+中文': [],   // act积极的 act活动
  '单词+解释+重复': [],     // angry生某人的气 angry
  '含特殊符号': [],          // 含"-" "/" "["等
  '含音标': [],              // 含[xxx]音标
};

for (const w of words) {
  if (!w.collocations) continue;
  for (let i = 0; i < w.collocations.length; i++) {
    const c = w.collocations[i];
    if (typeof c !== 'string') continue;
    if (!c.toLowerCase().startsWith(w.word.toLowerCase())) continue;
    
    const after = c.substring(w.word.length);
    if (!/[\u4e00-\u9fa5]/.test(after)) continue;
    
    const item = { word: w.word, current: c };
    
    if (/of\s*\d+/.test(c)) {
      categories['单词+页码+中文'].push(item);
    } else if (new RegExp('^' + w.word + w.word, 'i').test(c)) {
      categories['单词重复+中文'].push(item);
    } else if (/[\[\/\(\=]/.test(c)) {
      categories['含特殊符号'].push(item);
    } else if (/\[[^\]]+\]/.test(c)) {
      categories['含音标'].push(item);
    } else if (new RegExp('^' + w.word + '\\s').test(c)) {
      categories['单词+空格+中文'].push(item);
    } else if (new RegExp('^' + w.word + w.word, 'i').test(c)) {
      categories['单词重复+中文'].push(item);
    } else if (new RegExp('^' + w.word + '\\.').test(c)) {
      categories['含特殊符号'].push(item);
    } else {
      categories['单词+中文(短)'].push(item);
    }
  }
}

console.log('分类统计:');
for (const [cat, items] of Object.entries(categories)) {
  console.log('\n=== ' + cat + ': ' + items.length + ' 个 ===');
  items.slice(0, 5).forEach((item, i) => {
    console.log('  [' + item.word + '] "' + item.current + '"');
  });
}
