// 从OCR文本提取修正后单词的完整信息（释义、音标、词性、例句）
const fs = require('fs');
const path = require('path');
const words = require('E:/Tina/自研背单词软件/words.json');

const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();

// 需要更新信息的编号列表（所有被修正过拼写的词）
const correctedNums = [31, 40, 48, 56, 85, 136, 165, 231, 322, 327, 344, 372, 391, 414, 
  494, 500, 744, 839, 842, 843, 892, 893, 894, 917, 934, 950, 955, 1076, 1107, 1139, 
  1149, 1189, 1252, 1282, 1294, 1334, 1353, 1379, 1426, 1454, 1474, 1476, 1494, 1514, 
  1587, 1610, 1625, 1722, 1725, 1744];

// 对每个编号，在OCR文本中找到完整词条信息
const updates = {};

correctedNums.forEach(num => {
  for (const f of files) {
    const content = fs.readFileSync(path.join(ocrDir, f), 'utf8');
    // 搜索编号.或编号)开头
    const re = new RegExp(`(?<!\\d)${num}[.,)]\\s*([\\s\\S]{0,500}?)(?=(?:\\d{1,4}[.,)])|$)`, 'g');
    let m;
    while ((m = re.exec(content)) !== null) {
      const block = m[1].substring(0, 400);
      updates[num] = { file: f, block: block };
      break;
    }
    if (updates[num]) break;
  }
});

// 输出找到的信息
Object.entries(updates).forEach(([num, data]) => {
  console.log(`\n=== ${num} (${data.file}) ===`);
  console.log(data.block.substring(0, 200).replace(/\n/g, ' '));
});
