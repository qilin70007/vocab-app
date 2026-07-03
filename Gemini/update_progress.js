const fs = require('fs');
const p = require('../data/progress.json');
const w = require('../words.json');

// 只保留在新词库中存在的单词的进度
const validWords = new Set(w.map(x => x.word.toLowerCase()));
const newProgress = {};

Object.keys(p).forEach(key => {
  if (validWords.has(key.toLowerCase())) {
    newProgress[key] = p[key];
  }
});

console.log('原进度记录:', Object.keys(p).length);
console.log('新词库单词数:', w.length);
console.log('保留的进度记录:', Object.keys(newProgress).length);
console.log('丢弃的进度记录:', Object.keys(p).length - Object.keys(newProgress).length);

fs.writeFileSync('../data/progress.json', JSON.stringify(newProgress, null, 2), 'utf8');
console.log('已更新: data/progress.json');

// 也更新meta.json
const meta = { totalWords: w.length, updatedAt: new Date().toISOString() };
fs.writeFileSync('../data/meta.json', JSON.stringify(meta, null, 2), 'utf8');
console.log('已更新: data/meta.json', JSON.stringify(meta));
