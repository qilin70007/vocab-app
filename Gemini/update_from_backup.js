// 用旧词库(words_backup_1908.json)重新匹配修正后单词的释义
const fs = require('fs');
const words = require('E:/Tina/自研背单词软件/words.json');
const backup = require('E:/Tina/自研背单词软件/words_backup_1908.json');

// 建立旧词库的word->entry映射（小写匹配）
const backupMap = {};
backup.forEach(x => {
  const w = x.word.toLowerCase();
  if (!backupMap[w]) backupMap[w] = x;
});

// 被修正过拼写的编号
const correctedNums = [31, 40, 48, 56, 85, 165, 231, 327, 344, 372, 414, 
  494, 744, 839, 893, 894, 917, 934, 955, 1076, 1139, 
  1149, 1189, 1252, 1294, 1334, 1379, 1454, 1476, 1494, 
  1514, 1625, 1722, 414];

let updated = 0;
let notFound = [];

correctedNums.forEach(num => {
  const entry = words.find(x => x.number === num);
  if (!entry) return;
  
  const backupEntry = backupMap[entry.word.toLowerCase()];
  if (backupEntry) {
    // 更新释义、音标、词性等信息
    if (backupEntry.meaning) entry.meaning = backupEntry.meaning;
    if (backupEntry.phonetic) entry.phonetic = backupEntry.phonetic;
    if (backupEntry.pos) entry.pos = backupEntry.pos;
    if (backupEntry.examples) entry.examples = backupEntry.examples;
    if (backupEntry.forms) entry.forms = backupEntry.forms;
    console.log(`✓ ${num}. ${entry.word} → 从旧词库更新信息`);
    updated++;
  } else {
    console.log(`✗ ${num}. ${entry.word} → 旧词库中未找到`);
    notFound.push(num);
  }
});

console.log(`\n从旧词库更新 ${updated} 个词，${notFound.length} 个未找到: ${notFound.join(', ')}`);

fs.writeFileSync('E:/Tina/自研背单词软件/words.json', JSON.stringify(words, null, 2), 'utf8');
console.log('已写入 words.json');
