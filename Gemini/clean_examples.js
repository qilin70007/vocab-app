const fs = require('fs');
const data = require('../words_ocr_final.json');

// 清理例句中的乱码
// 策略：英文例句中混入的乱码中文通常是大写字母序列、特殊符号组合
// 保留例句的英文部分，去掉后面的乱码尾巴

function cleanExample(ex) {
  // 例句模式1: "English text. 乱码中文"
  // 例句模式2: "乱码前缀 English text. 乱码中文"
  // 策略：找到最后一个英文句号/问号/感叹号的位置，截断后面的乱码
  
  let cleaned = ex.trim();
  
  // 去掉开头的乱码前缀（如 "ores ", "err ", "& WEP" 等）
  // 看看开头是否有几个非英文单词的字符
  cleaned = cleaned.replace(/^[^a-zA-Z"'"]+/, '');
  
  // 找到最后一个合理的英文标点位置
  const match = cleaned.match(/^(.*?[.!?])\s*[^a-zA-Z]*$/);
  if (match && match[1].length > 10) {
    // 检查句号后面是不是纯乱码
    const afterPeriod = cleaned.substring(match[1].length).trim();
    if (afterPeriod.length > 0) {
      // 如果句号后的内容主要是大写字母、数字、特殊符号（没有连续的小写英文单词），就是乱码
      const hasEnglishWord = /[a-z]{3,}/.test(afterPeriod);
      if (!hasEnglishWord) {
        return match[1];
      }
    }
  }
  
  // 另一种模式：整个例句是英文+乱码混合
  // 尝试按行分割，只保留有意义的英文行
  const lines = cleaned.split(/[\n\r]+/);
  if (lines.length > 1) {
    const goodLines = lines.filter(l => {
      const trimmed = l.trim();
      if (trimmed.length < 5) return false;
      // 至少有3个连续小写字母（英文单词）
      return /[a-z]{3,}/.test(trimmed);
    });
    if (goodLines.length > 0) {
      return goodLines.join(' ');
    }
  }
  
  return cleaned;
}

let cleanedCount = 0;
data.forEach(item => {
  if (item.examples && item.examples.length > 0) {
    const original = [...item.examples];
    item.examples = item.examples.map(ex => {
      const c = cleanExample(ex);
      if (c !== ex) cleanedCount++;
      return c;
    });
    // 过滤掉太短的
    item.examples = item.examples.filter(ex => ex.length >= 10);
  }
});

console.log('清理了', cleanedCount, '条例句');
console.log('---');

// 看看清理后的效果
data.slice(0, 5).forEach(x => {
  console.log(`${x.word}:`);
  x.examples.forEach(ex => console.log(`  "${ex}"`));
});
console.log('---');

// 最终统计
let noExamples = data.filter(x => !x.examples || x.examples.length === 0);
console.log('最终无例句:', noExamples.length, '个');
noExamples.forEach(x => console.log(`  ${x.number}. ${x.word}`));

// 写入最终文件
fs.writeFileSync('../words_ocr_final.json', JSON.stringify(data, null, 2), 'utf8');
console.log('已更新: words_ocr_final.json');
