// 逐页提取扫描版PDF词汇，写入 extracted_words.json
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = 'E:/Tina/自研背单词软件/extracted_words.json';
const PAGES_DIR = 'E:/Tina/自研背单词软件/pdf_pages';

// 读取已有数据（如果有）
function loadExisting() {
  try {
    const raw = fs.readFileSync(OUTPUT_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// 追加词条并保存
function appendWords(words) {
  const existing = loadExisting();
  const all = existing.concat(words);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(all, null, 2));
  console.log(`Appended ${words.length} words. Total: ${all.length}`);
  return all.length;
}

// 获取当前总数
function getCurrentCount() {
  return loadExisting().length;
}

// 导出函数供命令行调用
module.exports = { loadExisting, appendWords, getCurrentCount };

// 命令行模式：node extract_words.js add 'JSON_ARRAY'
if (process.argv[2] === 'add') {
  const words = JSON.parse(process.argv[3]);
  appendWords(words);
} else if (process.argv[2] === 'count') {
  console.log('Current count:', getCurrentCount());
} else if (process.argv[2] === 'reset') {
  fs.writeFileSync(OUTPUT_FILE, '[]');
  console.log('Reset to empty array');
}
