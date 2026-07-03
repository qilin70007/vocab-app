/**
 * 单词数据审计脚本
 * 扫描 words.json 中的所有单词，标记潜在问题
 */

const fs = require('fs');

const WORDS_FILE = 'words.json';
const OUTPUT_FILE = 'audit_report.json';

// 乱码字符模式
const GARBAGE_PATTERNS = [
  /[\u4e00-\u9fa5]*[\?\ufffd\u25a1]/,  // 中文+问号/乱码方块
  /cs\s*TBP/,  // 常见OCR错误
  /ability\./,  // 常见OCR错误
  /\d+\.\s*\d+/,  // 数字.数字 格式异常
];

// 搭配应该以介词、动词或固定短语开头，而不是单词本身重复
function checkCollocation(word, coll) {
  if (!coll || typeof coll !== 'string') return { valid: false, reason: 'empty' };
  
  // 去掉序号前缀如 "(1)", "1."
  const cleanColl = coll.replace(/^\s*(?:\(\d+\)|\d+\.)\s*/, '').trim();
  
  // 如果以单词本身开头（如 "accidentt"），可能是OCR错误
  const wordLower = word.toLowerCase();
  const collLower = cleanColl.toLowerCase();
  
  if (collLower.startsWith(wordLower) && !collLower.startsWith(wordLower + ' ')) {
    return { valid: false, reason: 'starts_with_word', hint: '搭配不应以单词本身开头' };
  }
  
  // 检查是否包含乱码
  if (/[\?\ufffd\u25a1]/.test(coll)) {
    return { valid: false, reason: 'garbage_chars' };
  }
  
  return { valid: true };
}

function checkPhonetic(phonetic) {
  if (!phonetic) return { valid: false, reason: 'empty' };
  // 音标应该包含 [ 和 ]
  if (!phonetic.includes('[') || !phonetic.includes(']')) {
    return { valid: false, reason: 'missing_brackets' };
  }
  // 检查乱码
  if (/[\?\ufffd\u25a1]/.test(phonetic)) {
    return { valid: false, reason: 'garbage_chars' };
  }
  return { valid: true };
}

function checkExample(example, word) {
  if (!example || typeof example !== 'string') return { valid: false, reason: 'empty' };
  
  // 检查乱码
  if (/[\?\ufffd\u25a1]/.test(example)) {
    return { valid: false, reason: 'garbage_chars' };
  }
  
  // 例句应该包含单词本身（或变形）
  const wordLower = word.toLowerCase();
  const exampleLower = example.toLowerCase();
  
  // 简单的包含检查（不考虑变形）
  if (!exampleLower.includes(wordLower)) {
    // 可能使用了变形，暂时标记为警告
    return { valid: true, warning: 'word_not_in_example' };
  }
  
  return { valid: true };
}

function auditWords() {
  console.log('开始审计单词数据...');
  
  const content = fs.readFileSync(WORDS_FILE, 'utf-8');
  const words = JSON.parse(content);
  
  const report = {
    total: words.length,
    issues: [],
    stats: {
      phoneticIssues: 0,
      collocationIssues: 0,
      exampleIssues: 0,
      meaningIssues: 0
    }
  };
  
  for (const word of words) {
    const wordIssues = {
      number: word.number,
      word: word.word,
      section: word.section,
      problems: []
    };
    
    // 检查音标
    const phoneticCheck = checkPhonetic(word.phonetic);
    if (!phoneticCheck.valid) {
      wordIssues.problems.push({
        field: 'phonetic',
        value: word.phonetic,
        issue: phoneticCheck.reason
      });
      report.stats.phoneticIssues++;
    }
    
    // 检查词义
    if (!word.meaning || word.meaning.trim() === '') {
      wordIssues.problems.push({
        field: 'meaning',
        value: word.meaning,
        issue: 'empty'
      });
      report.stats.meaningIssues++;
    }
    
    // 检查搭配
    if (word.collocations && word.collocations.length > 0) {
      for (let i = 0; i < word.collocations.length; i++) {
        const coll = word.collocations[i];
        const collCheck = checkCollocation(word.word, coll);
        if (!collCheck.valid) {
          wordIssues.problems.push({
            field: 'collocations',
            index: i,
            value: coll,
            issue: collCheck.reason,
            hint: collCheck.hint
          });
          report.stats.collocationIssues++;
        }
      }
    }
    
    // 检查例句
    if (word.examples && word.examples.length > 0) {
      for (let i = 0; i < word.examples.length; i++) {
        const ex = word.examples[i];
        const exCheck = checkExample(ex, word.word);
        if (!exCheck.valid) {
          wordIssues.problems.push({
            field: 'examples',
            index: i,
            value: ex,
            issue: exCheck.reason
          });
          report.stats.exampleIssues++;
        } else if (exCheck.warning) {
          wordIssues.problems.push({
            field: 'examples',
            index: i,
            value: ex,
            issue: exCheck.warning,
            severity: 'warning'
          });
        }
      }
    }
    
    if (wordIssues.problems.length > 0) {
      report.issues.push(wordIssues);
    }
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2), 'utf-8');
  
  console.log('\n========== 审计报告 ==========');
  console.log(`总单词数: ${report.total}`);
  console.log(`问题单词数: ${report.issues.length}`);
  console.log(`问题率: ${(report.issues.length / report.total * 100).toFixed(1)}%`);
  console.log('\n问题分布:');
  console.log(`  音标问题: ${report.stats.phoneticIssues}`);
  console.log(`  词义问题: ${report.stats.meaningIssues}`);
  console.log(`  搭配问题: ${report.stats.collocationIssues}`);
  console.log(`  例句问题: ${report.stats.exampleIssues}`);
  console.log(`\n详细报告已保存到: ${OUTPUT_FILE}`);
  
  // 输出前20个有问题的单词
  console.log('\n========== 前20个需校对单词 ==========');
  report.issues.slice(0, 20).forEach((item, idx) => {
    console.log(`\n${idx + 1}. ${item.word} (第${item.number}号, ${item.section}组)`);
    item.problems.forEach(p => {
      const severity = p.severity === 'warning' ? '[警告]' : '[错误]';
      console.log(`   ${severity} ${p.field}: ${p.issue}`);
      if (p.value) console.log(`       值: "${p.value}"`);
    });
  });
}

auditWords();
