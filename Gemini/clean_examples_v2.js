const fs = require('fs');
const data = require('../words_ocr_final.json');

function cleanExample(ex) {
  let cleaned = ex.trim();
  
  // 1. 去掉开头的乱码前缀
  cleaned = cleaned.replace(/^[^a-zA-Z"'\u201c]+/, '');
  
  // 2. 找最后一个英文句号/问号/感叹号，如果后面跟的不是纯英文内容，就截断
  // 找所有句末标点的位置
  const punctRegex = /[.!?]/g;
  let lastGoodPunct = -1;
  let match;
  while ((match = punctRegex.exec(cleaned)) !== null) {
    const afterIdx = match.index + 1;
    const after = cleaned.substring(afterIdx).trim();
    
    if (after.length === 0) {
      // 句号后没东西，这是干净结尾
      lastGoodPunct = afterIdx;
      break;
    }
    
    // 检查句号后的内容是否有连续英文单词（小写3+字母）
    const hasEngWord = /[a-z]{3,}/.test(after);
    if (hasEngWord) {
      // 句号后有英文单词，可能是下一句，继续找
      continue;
    } else {
      // 句号后没有英文单词 → 后面是乱码，截断到这里
      lastGoodPunct = afterIdx;
      break;
    }
  }
  
  if (lastGoodPunct > 0) {
    cleaned = cleaned.substring(0, lastGoodPunct).trim();
  }
  
  // 3. 处理"English text 乱码"没有句号的情况
  // 找最后一个连续小写英文单词后的位置
  if (cleaned.length > 60) {
    const wordMatch = cleaned.match(/^(.*?[a-z]{2,})\s+[^a-z]*[A-Z]{3,}/);
    if (wordMatch) {
      // 找到英文单词后跟大写乱码的位置
      const cutIdx = cleaned.indexOf(wordMatch[1]) + wordMatch[1].length;
      // 只在cutIdx之后是乱码时才截断
      const after = cleaned.substring(cutIdx).trim();
      if (after && !/[a-z]{3,}/.test(after.substring(0, 20))) {
        cleaned = cleaned.substring(0, cutIdx).trim();
        // 补个句号
        if (!/[.!?]$/.test(cleaned)) cleaned += '.';
      }
    }
  }
  
  // 4. 去掉行内的大写乱码块（3个以上连续大写字母+数字+符号）
  // 如 "amusement park. 4RPFMABKRABAADNRASAHABRS| AMPMADH, HN"
  // 这种在句号后已经截断了，但有些行内混合的
  // 去掉 "word. 乱码" 中句号后的乱码
  cleaned = cleaned.replace(/([.!?])\s+[A-Z0-9|/\\#@\$\%\^\&\*\(\)\-_\+=\{\}\[\]:;"'<>,.?\/!~`]{5,}.*$/, '$1');
  
  // 5. 去掉行尾的非ASCII非中文乱码
  // 保留：英文字母、数字、基本标点、中文字符
  // 去掉：连续的特殊符号块
  cleaned = cleaned.replace(/\s+[^\w\s\u4e00-\u9fff.,;:!?'"\-()]{3,}.*$/, '');
  
  return cleaned;
}

let cleanedCount = 0;
const beforeAfter = [];

data.forEach(item => {
  if (item.examples && item.examples.length > 0) {
    item.examples = item.examples.map(ex => {
      const c = cleanExample(ex);
      if (c !== ex) {
        cleanedCount++;
        if (beforeAfter.length < 10) {
          beforeAfter.push({ word: item.word, before: ex, after: c });
        }
      }
      return c;
    });
    // 过滤太短的
    item.examples = item.examples.filter(ex => ex.length >= 10);
    // 去重
    item.examples = [...new Set(item.examples)];
  }
});

console.log('清理了', cleanedCount, '条例句');
console.log('---');
console.log('清理效果对比:');
beforeAfter.forEach(x => {
  console.log(`${x.word}:`);
  console.log(`  前: "${x.before.substring(0, 100)}"`);
  console.log(`  后: "${x.after.substring(0, 100)}"`);
});
console.log('---');

let noExamples = data.filter(x => !x.examples || x.examples.length === 0);
console.log('最终无例句:', noExamples.length, '个');
noExamples.forEach(x => console.log(`  ${x.number}. ${x.word}`));

fs.writeFileSync('../words_ocr_final.json', JSON.stringify(data, null, 2), 'utf8');
console.log('已更新: words_ocr_final.json');
