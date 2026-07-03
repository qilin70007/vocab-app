/**
 * 导出需要修复的搭配和例句
 * 按问题类型分类，方便后续批量处理
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

const exportData = {
  collocations_needs_fix: [],  // 搭配以单词开头，格式被吃
  collocations_garbage: [],    // 搭配含乱码
  examples_garbage: [],        // 例句含乱码/OCR垃圾
  examples_maybe_ok: []        // 例句不含单词但可能是变形
};

for (const word of words) {
  // 搭配
  if (word.collocations) {
    for (let i = 0; i < word.collocations.length; i++) {
      const coll = word.collocations[i];
      if (!coll) continue;
      
      const cleanColl = coll.replace(/^\s*(?:\(\d+\)|\d+\.)\s*/, '').trim();
      const wordLower = word.word.toLowerCase();
      const collLower = cleanColl.toLowerCase();
      
      if (collLower.startsWith(wordLower) && !collLower.startsWith(wordLower + ' ')) {
        exportData.collocations_needs_fix.push({
          number: word.number,
          word: word.word,
          section: word.section,
          collocation_index: i,
          collocation: coll,
          meaning: word.meaning
        });
      }
      
      if (/[\?\ufffd\u25a1]/.test(coll)) {
        exportData.collocations_garbage.push({
          number: word.number,
          word: word.word,
          collocation_index: i,
          collocation: coll
        });
      }
    }
  }
  
  // 例句
  if (word.examples) {
    for (let i = 0; i < word.examples.length; i++) {
      const ex = word.examples[i];
      if (!ex) continue;
      
      if (/[\?\ufffd\u25a1]/.test(ex)) {
        exportData.examples_garbage.push({
          number: word.number,
          word: word.word,
          section: word.section,
          example_index: i,
          example: ex,
          meaning: word.meaning
        });
      } else if (!ex.toLowerCase().includes(word.word.toLowerCase())) {
        // 判断是否是OCR乱码
        const englishPart = ex.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g, '').trim();
        if (/^[A-Z\s\.\,\!\?\-—]+$/.test(englishPart) && englishPart.length > 10) {
          exportData.examples_garbage.push({
            number: word.number,
            word: word.word,
            section: word.section,
            example_index: i,
            example: ex,
            meaning: word.meaning,
            type: 'ocr_garbage'
          });
        } else {
          exportData.examples_maybe_ok.push({
            number: word.number,
            word: word.word,
            example_index: i,
            example: ex
          });
        }
      }
    }
  }
}

// 统计
console.log('========== 导出统计 ==========');
console.log(`搭配需修复(格式被吃): ${exportData.collocations_needs_fix.length}`);
console.log(`搭配含乱码: ${exportData.collocations_garbage.length}`);
console.log(`例句含乱码/OCR垃圾: ${exportData.examples_garbage.length}`);
console.log(`例句可能OK(变形): ${exportData.examples_maybe_ok.length}`);

// 保存
const OUTPUT_PATH = 'E:\\Tina\\自研背单词软件\\fix_export.json';
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(exportData, null, 2), 'utf-8');
console.log(`\n已导出到: fix_export.json`);

// 输出需要修复的搭配，按单词分组
const collByWord = {};
exportData.collocations_needs_fix.forEach(c => {
  if (!collByWord[c.word]) collByWord[c.word] = [];
  collByWord[c.word].push(c);
});

console.log(`\n受影响单词数: ${Object.keys(collByWord).length}`);

// 输出完整列表
console.log('\n========== 完整搭配修复列表 ==========');
Object.keys(collByWord).sort().forEach(word => {
  const items = collByWord[word];
  console.log(`\n${word} (${items[0].meaning || ''}):`);
  items.forEach(item => {
    console.log(`  [${item.collocation_index}] ${item.collocation}`);
  });
});
