// 计算每个编号对应的PDF页码
// 词汇从page_0008开始，到page_0382结束
// 但不是每页都是词汇页，有些是练习页
// 先根据OCR文本确定每个编号在哪个OCR文件中

const fs = require('fs');
const path = require('path');

const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();

// 需要查找的编号（重复词中需要确认的）
const targets = [40, 48, 744, 842, 893, 894, 934, 1149, 1252, 1294, 1379, 1454, 1494, 1722, 494, 839];

// 对每个编号，在所有OCR文件中搜索
targets.forEach(num => {
  console.log(`\n=== ${num} ===`);
  let count = 0;
  files.forEach(f => {
    const content = fs.readFileSync(path.join(ocrDir, f), 'utf8');
    // 搜索编号.或编号)后面跟着的内容
    const re = new RegExp(`\\b${num}[.)、]`, 'g');
    let m;
    while ((m = re.exec(content)) !== null && count < 3) {
      const ctx = content.substring(Math.max(0, m.index - 5), m.index + 80).replace(/\n/g, ' ');
      console.log(`  ${f}: "${ctx}"`);
      count++;
    }
  });
  if (count === 0) console.log('  未找到');
});
