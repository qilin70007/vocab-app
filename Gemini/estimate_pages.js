// 估算每个编号对应的PDF页面，然后查看图片
// 根据OCR文本，找到已知的编号-页面对应关系，推算缺失编号的页面

const fs = require('fs');
const path = require('path');

const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();

// 收集所有编号->OCR文件的映射
const numToFile = {};
files.forEach(f => {
  const content = fs.readFileSync(path.join(ocrDir, f), 'utf8');
  // 找所有 "数字." 模式，数字在1-1785范围内
  const re = /(\d{1,4})[.)、]\s*["'""\*\.\u201c\u201d]*\s*[a-zA-Z]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const num = parseInt(m[1]);
    if (num >= 1 && num <= 1785 && !numToFile[num]) {
      numToFile[num] = f;
    }
  }
});

// 已知编号和页面的对应关系
const known = [
  {num: 490, file: 'page_0082.txt'},
  {num: 500, file: 'page_0082.txt'},
  {num: 842, file: 'page_0133.txt'},
  {num: 843, file: 'page_0134.txt'},
  {num: 892, file: 'page_0141.txt'},
  {num: 966, file: 'page_0155.txt'},
  {num: 1114, file: 'page_0178.txt'},
  {num: 1222, file: 'page_0191.txt'},
  {num: 1282, file: 'page_0199.txt'},
  {num: 1353, file: 'page_0208.txt'},
  {num: 1426, file: 'page_0216.txt'},
  {num: 1474, file: 'page_0223.txt'},
];

// 需要查找的编号
const targets = [494, 744, 839, 893, 894, 934, 1149, 1252, 1294, 1379, 1454, 1494];

// 利用已知的编号-页面对应关系，估算缺失编号的页面
targets.forEach(target => {
  // 找到target前后最近的已知编号
  const allKnown = Object.entries(numToFile).map(([n, f]) => ({num: parseInt(n), file: f}));
  allKnown.sort((a, b) => a.num - b.num);
  
  // 找target前后的已知编号
  let before = null, after = null;
  for (const item of allKnown) {
    if (item.num < target) before = item;
    if (item.num > target && !after) after = item;
  }
  
  console.log(`${target}: before=${before ? before.num + '(' + before.file + ')' : '无'} after=${after ? after.num + '(' + after.file + ')' : '无'}`);
  
  // 估算页面
  if (before && after) {
    const pageNumBefore = parseInt(before.file.match(/(\d+)/)[1]);
    const pageNumAfter = parseInt(after.file.match(/(\d+)/)[1]);
    const numRange = after.num - before.num;
    const pageRange = pageNumAfter - pageNumBefore;
    const ratio = (target - before.num) / numRange;
    const estPage = Math.round(pageNumBefore + ratio * pageRange);
    console.log(`  估算页面: page_${String(estPage).padStart(4, '0')}.png`);
  }
});
