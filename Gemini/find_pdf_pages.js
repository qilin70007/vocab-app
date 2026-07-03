// 对于旧词库中找不到的词，需要看PDF图片
// 先确认每个编号对应的PDF页码
const fs = require('fs');
const path = require('path');

const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();

const targets = [56, 165, 231, 344, 372, 414, 893, 955, 1076, 1139, 1149, 1189, 1294, 1625];

targets.forEach(num => {
  let found = false;
  for (const f of files) {
    const content = fs.readFileSync(path.join(ocrDir, f), 'utf8');
    const re = new RegExp(`(?<!\\d)${num}[.,)]`);
    const idx = content.search(re);
    if (idx >= 0) {
      const ctx = content.substring(idx, idx + 120).replace(/\n/g, ' ');
      const pageNum = f.match(/(\d+)/)[1];
      console.log(`${num}: ${f} (page_${pageNum}.png) → "${ctx}"`);
      found = true;
      break;
    }
  }
  if (!found) console.log(`${num}: 未找到`);
});
