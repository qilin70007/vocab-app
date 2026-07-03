/**
 * 深度分析单词数据问题
 * 分类问题类型，识别可自动修复 vs 需人工校对
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const OUTPUT_PATH = 'E:\\Tina\\自研背单词软件\\deep_analysis.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

const analysis = {
  total: words.length,
  phonetic: {
    missing_brackets: [],  // /eɪm/ → [eɪm]
    garbage: [],
    empty: []
  },
  collocations: {
    starts_with_word: [],  // 搭配以单词开头
    garbage: [],
    malformed: []  // 格式错误
  },
  examples: {
    garbage: [],  // 含乱码
    word_not_in_example: [],  // 例句不含单词
    empty: []
  },
  forms: {
    issues: []
  }
};

for (const word of words) {
  // 音标分析
  if (!word.phonetic) {
    analysis.phonetic.empty.push({ number: word.number, word: word.word });
  } else if (!word.phonetic.includes('[') || !word.phonetic.includes(']')) {
    if (word.phonetic.includes('/')) {
      analysis.phonetic.missing_brackets.push({ 
        number: word.number, 
        word: word.word, 
        phonetic: word.phonetic,
        fix: '[' + word.phonetic.replace(/\//g, '') + ']'
      });
    } else {
      analysis.phonetic.garbage.push({ 
        number: word.number, 
        word: word.word, 
        phonetic: word.phonetic 
      });
    }
  } else if (/[\?\ufffd\u25a1]/.test(word.phonetic)) {
    analysis.phonetic.garbage.push({ 
      number: word.number, 
      word: word.word, 
      phonetic: word.phonetic 
    });
  }
  
  // 搭配分析
  if (word.collocations) {
    for (let i = 0; i < word.collocations.length; i++) {
      const coll = word.collocations[i];
      if (!coll) continue;
      
      const cleanColl = coll.replace(/^\s*(?:\(\d+\)|\d+\.)\s*/, '').trim();
      const wordLower = word.word.toLowerCase();
      const collLower = cleanColl.toLowerCase();
      
      if (collLower.startsWith(wordLower) && !collLower.startsWith(wordLower + ' ')) {
        // 检查是否是 "word中文中文" 这种OCR把格式吃掉的情况
        const afterWord = cleanColl.substring(wordLower.length);
        const hasChinese = /[\u4e00-\u9fa5]/.test(afterWord);
        const hasEnglish = /[a-zA-Z]/.test(afterWord);
        
        if (hasChinese && !hasEnglish) {
          // "accidentt  车祸" → 可能是 "car accident  车祸" 这种
          analysis.collocations.starts_with_word.push({
            number: word.number,
            word: word.word,
            collocation: coll,
            type: 'word_plus_chinese',
            auto_fixable: false  // 需要判断原本搭配是什么
          });
        } else if (hasChinese && hasEnglish) {
          // "advise建议某人做某事" → 可能是 "advise sb to do sth 建议某人做某事"
          analysis.collocations.starts_with_word.push({
            number: word.number,
            word: word.word,
            collocation: coll,
            type: 'word_plus_mixed',
            auto_fixable: false
          });
        } else {
          analysis.collocations.starts_with_word.push({
            number: word.number,
            word: word.word,
            collocation: coll,
            type: 'other',
            auto_fixable: false
          });
        }
      }
      
      if (/[\?\ufffd\u25a1]/.test(coll)) {
        analysis.collocations.garbage.push({
          number: word.number,
          word: word.word,
          collocation: coll
        });
      }
    }
  }
  
  // 例句分析
  if (word.examples) {
    for (let i = 0; i < word.examples.length; i++) {
      const ex = word.examples[i];
      if (!ex) continue;
      
      if (/[\?\ufffd\u25a1]/.test(ex)) {
        analysis.examples.garbage.push({
          number: word.number,
          word: word.word,
          example: ex
        });
      } else if (!ex.toLowerCase().includes(word.word.toLowerCase())) {
        // 例句不含单词 - 进一步判断是否是纯乱码
        const englishPart = ex.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g, '').trim();
        const chinesePart = ex.match(/[\u4e00-\u9fa5]+/g);
        
        // 如果英文部分主要是大写字母堆砌（OCR乱码特征）
        if (/^[A-Z\s\.\,\!\?\-—]+$/.test(englishPart) && englishPart.length > 10) {
          analysis.examples.garbage.push({
            number: word.number,
            word: word.word,
            example: ex,
            type: 'ocr_garbage'
          });
        } else {
          analysis.examples.word_not_in_example.push({
            number: word.number,
            word: word.word,
            example: ex
          });
        }
      }
    }
  }
}

// 输出分析报告
console.log('========== 深度分析报告 ==========');
console.log(`总单词数: ${analysis.total}\n`);

console.log('--- 音标问题 ---');
console.log(`  缺括号(可自动修复): ${analysis.phonetic.missing_brackets.length}`);
console.log(`  乱码: ${analysis.phonetic.garbage.length}`);
console.log(`  空: ${analysis.phonetic.empty.length}`);

console.log('\n--- 搭配问题 ---');
console.log(`  以单词开头(格式被吃): ${analysis.collocations.starts_with_word.length}`);
console.log(`  含乱码: ${analysis.collocations.garbage.length}`);

console.log('\n--- 例句问题 ---');
console.log(`  含乱码/OCR垃圾: ${analysis.examples.garbage.length}`);
console.log(`  不含单词(可能变形): ${analysis.examples.word_not_in_example.length}`);

console.log('\n--- 可自动修复统计 ---');
console.log(`  音标缺括号: ${analysis.phonetic.missing_brackets.length} 个可自动修复`);

// 输出搭配问题的详细分类
const collTypes = {};
analysis.collocations.starts_with_word.forEach(c => {
  collTypes[c.type] = (collTypes[c.type] || 0) + 1;
});
console.log('\n搭配问题分类:');
Object.entries(collTypes).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

// 输出例句乱码的前30个
console.log('\n--- 例句乱码样本(前30) ---');
analysis.examples.garbage.slice(0, 30).forEach((e, i) => {
  console.log(`${i + 1}. [${e.word}] ${e.example}`);
});

// 输出搭配问题样本(前30)
console.log('\n--- 搭配问题样本(前30) ---');
analysis.collocations.starts_with_word.slice(0, 30).forEach((c, i) => {
  console.log(`${i + 1}. [${c.word}] ${c.collocation}`);
});

// 保存完整分析报告
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(analysis, null, 2), 'utf-8');
console.log('\n完整分析报告已保存到: deep_analysis.json');
