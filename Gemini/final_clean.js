const fs = require('fs');
const data = require('../words_ocr_final.json');

// 1. 修正已知OCR拼写错误
const spellingFixes = {
  'bicyele': 'bicycle',
  'reck': 'rock',
  'ery': 'entry',
};

// 2. 清理例句的残余问题
function finalClean(ex, word) {
  let cleaned = ex.trim();
  
  // 去掉 "or? " 开头的乱码
  cleaned = cleaned.replace(/^or\?\s+/i, '');
  // 去掉 "err " 等单字母/短乱码前缀
  cleaned = cleaned.replace(/^(err|ore|ors|res|rea|ind)\s+([A-Z])/, '$2');
  // 去掉开头的特殊符号
  cleaned = cleaned.replace(/^[→>•\*\d\.\)]+\s*/, '');
  
  // 去掉条目碎片（含音标格式的）
  if (/^[a-z]+\s*\/[^/]+\//.test(cleaned)) return null;
  if (/^[a-z]+\s+\/.*\/\s*(adj|n|v|adv|prep|conj|pron)\./.test(cleaned)) return null;
  
  // 去掉 "away /o'wer adv." 这种
  if (/^[a-z]+\s+\/.*\/\s*\w+\.?\s*$/.test(cleaned)) return null;
  
  // 如果例句不包含目标单词，跳过
  const wordLower = word.toLowerCase();
  const exLower = cleaned.toLowerCase();
  if (!exLower.includes(wordLower) && !exLower.includes(wordLower.substring(0, Math.max(4, wordLower.length - 2)))) {
    return null;
  }
  
  return cleaned;
}

let fixed = 0;
let removedCount = 0;

data.forEach(item => {
  // 修正拼写
  if (spellingFixes[item.word]) {
    console.log(`修正拼写: ${item.word} → ${spellingFixes[item.word]}`);
    item.word = spellingFixes[item.word];
    fixed++;
  }
  
  // 清理例句
  if (item.examples && item.examples.length > 0) {
    const cleaned = [];
    item.examples.forEach(ex => {
      const result = finalClean(ex, item.word);
      if (result && result.length >= 15) {
        cleaned.push(result);
      } else {
        removedCount++;
      }
    });
    item.examples = [...new Set(cleaned)];
  }
});

console.log('修正拼写:', fixed, '个');
console.log('移除无效例句:', removedCount, '条');
console.log('---');

// 最终统计
let noExamples = data.filter(x => !x.examples || x.examples.length === 0);
console.log('无例句:', noExamples.length, '个');
noExamples.forEach(x => console.log(`  ${x.number}. ${x.word}`));

let noMeaning = data.filter(x => !x.meaning || x.meaning.trim().length === 0);
let noPhonetic = data.filter(x => !x.phonetic || x.phonetic.trim().length === 0);
console.log(`总词数: ${data.length}`);
console.log(`有释义: ${data.length - noMeaning.length}`);
console.log(`有音标: ${data.length - noPhonetic.length}`);
console.log(`有例句: ${data.length - noExamples.length} (${((data.length - noExamples.length)/data.length*100).toFixed(1)}%)`);

// 验证前10个
console.log('---');
console.log('前5个词最终效果:');
data.slice(0, 5).forEach(x => {
  console.log(`${x.number}. ${x.word} [${x.phonetic}] ${x.pos} ${x.meaning}`);
  x.examples.forEach(ex => console.log(`  → ${ex}`));
  if (x.phrases.length > 0) console.log(`  搭配: ${x.phrases.join('; ')}`);
  if (x.forms.length > 0) console.log(`  词形: ${x.forms.join('; ')}`);
});

fs.writeFileSync('../words_ocr_final.json', JSON.stringify(data, null, 2), 'utf8');
console.log('\n已写入: words_ocr_final.json');
