const fs = require('fs');
const data = require('../words_ocr_final.json');

function isGoodExample(ex, word) {
  const lower = ex.toLowerCase();
  const wordLower = word.toLowerCase();
  
  // 1. 必须包含目标单词（或其变形）
  if (!lower.includes(wordLower) && !lower.includes(wordLower.substring(0, Math.max(3, wordLower.length - 2)))) {
    return false;
  }
  
  // 2. 不能是词条碎片（如 "autumn /s:tom/n." 这种）
  if (/^[a-z]+\s*\/.*\//.test(ex.trim())) return false;
  if (/^[a-z]+\s+[a-z]+\s*\d+\./.test(ex.trim())) return false;
  
  // 3. 长度至少15字符
  if (ex.length < 15) return false;
  
  // 4. 至少有3个英文单词
  const words = ex.match(/[a-zA-Z]+/g);
  if (!words || words.length < 3) return false;
  
  // 5. 不能是纯词条定义格式
  if (/^\d+\.\s*[a-z]/.test(ex.trim())) return false;
  
  return true;
}

function cleanPrefix(ex) {
  // 去掉开头的乱码前缀
  // 模式：非字母开头，或者少量乱码字母+空格+正文
  let cleaned = ex.trim();
  
  // 去掉开头的短乱码（1-4个非空格字符 + 空格）
  cleaned = cleaned.replace(/^[^a-zA-Z"\u201c]{1,5}\s+/, '');
  
  // 去掉开头的乱码单词（全大写或混合，后跟空格和正文）
  // 如 "ores His speech" → "His speech"
  const prefixMatch = cleaned.match(/^([a-z]{1,5})\s+([A-Z][a-z]+.*)/);
  if (prefixMatch && !['a', 'an', 'the', 'it', 'is', 'in', 'on', 'at', 'to', 'of', 'as', 'be', 'do', 'go', 'he', 'we', 'my', 'no', 'so', 'or', 'if', 'by', 'up'].includes(prefixMatch[1])) {
    // 可能是乱码前缀，去掉
    cleaned = prefixMatch[2];
  }
  
  return cleaned;
}

let removed = 0;
let cleaned = 0;

data.forEach(item => {
  if (item.examples && item.examples.length > 0) {
    const original = item.examples.length;
    item.examples = item.examples
      .map(ex => cleanPrefix(ex))
      .filter(ex => {
        if (isGoodExample(ex, item.word)) {
          return true;
        } else {
          removed++;
          return false;
        }
      });
    cleaned += (original - item.examples.length);
  }
});

console.log('过滤掉非例句:', removed, '条');
console.log('---');

// 看效果
data.slice(0, 10).forEach(x => {
  console.log(`${x.number}. ${x.word} (${x.examples.length}例句):`);
  x.examples.forEach(ex => console.log(`  "${ex}"`));
});
console.log('---');

let noExamples = data.filter(x => !x.examples || x.examples.length === 0);
console.log('最终无例句:', noExamples.length, '个');
noExamples.forEach(x => console.log(`  ${x.number}. ${x.word}`));

// 总体统计
let total = data.length;
let withExamples = data.filter(x => x.examples && x.examples.length > 0).length;
console.log(`---`);
console.log(`总词数: ${total}`);
console.log(`有例句: ${withExamples} (${(withExamples/total*100).toFixed(1)}%)`);
console.log(`无例句: ${noExamples.length} (${(noExamples.length/total*100).toFixed(1)}%)`);

fs.writeFileSync('../words_ocr_final.json', JSON.stringify(data, null, 2), 'utf8');
console.log('已更新: words_ocr_final.json');
