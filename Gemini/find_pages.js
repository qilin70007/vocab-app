// 根据OCR文本文件找到每个编号所在的页
const fs = require('fs');
const path = require('path');

const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();

// 重复的编号（需要查看PDF原页确认实际单词）
const targetNums = [96, 136, 322, 327, 414, 500, 893, 894, 917, 934, 950, 955, 1076, 1107, 1139, 1149, 1189, 1252, 1294, 1379, 1454, 1476, 1494, 1514, 1587, 1610, 1625, 1725, 1744, 284, 285];

// 对每个编号，找到它在哪个OCR文件中出现
targetNums.forEach(num => {
  let found = false;
  for (const f of files) {
    const content = fs.readFileSync(path.join(ocrDir, f), 'utf8');
    // 搜索编号
    const re = new RegExp(`\\b${num}[.)、]`);
    if (re.test(content)) {
      // 找到编号所在行附近的上下文
      const idx = content.search(new RegExp(`${num}[.)、]`));
      const ctx = content.substring(Math.max(0, idx - 20), idx + 80).replace(/\n/g, ' ');
      console.log(`${num}: ${f} → "${ctx}"`);
      found = true;
      break;
    }
  }
  if (!found) {
    console.log(`${num}: 未在OCR文本中找到`);
  }
});
