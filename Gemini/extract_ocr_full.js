// 从OCR文本中提取每个编号词条的完整信息：word, phonetic, pos, meaning, examples
// 以OCR原始文本为唯一数据源
const fs = require('fs');
const path = require('path');

const ocrDir = 'E:/Tina/自研背单词软件/ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt')).sort();

let allText = '';
files.forEach(f => {
  allText += fs.readFileSync(path.join(ocrDir, f), 'utf8') + '\n';
});

// 用正则找到每个编号词条的完整段落
// 格式特征：编号. 可能有引号/星号 + 英文单词 + 音标(//) + 词性 + 中文释义 + 例句
// 策略：找到"编号. 单词"的位置，然后截取到下一个"编号. 单词"之间的所有文本

// 第一步：找到所有编号词条的起始位置
const entryStartRegex = /(?:^|\n|\s)(\d{1,4})[.)]\s*["'""\*\.\u201c\u201d]*\s*([a-zA-Z][a-zA-Z\-']{0,30})(?:\s*\/|\s+(?:n|v|adj|adv|prep|conj|pron|art|num|aux|abbr|int|vt|vi|modal)\b|\s)/g;

let entries = [];
let m;
while ((m = entryStartRegex.exec(allText)) !== null) {
  const num = parseInt(m[1]);
  const word = m[2].toLowerCase().trim();
  if (num < 1 || num > 1785) continue;
  if (word.length < 1) continue;
  entries.push({
    number: num,
    word: word,
    start: m.index,
    matchEnd: m.index + m[0].length
  });
}

// 去重（保留第一次出现的）
const seen = new Set();
const unique = [];
entries.forEach(e => {
  if (!seen.has(e.number)) {
    seen.add(e.number);
    unique.push(e);
  }
});

// 按文本中出现顺序排列（已经是这个顺序了）
// 第二步：截取每个词条到下一个词条之间的文本
for (let i = 0; i < unique.length; i++) {
  const start = unique[i].start;
  const end = i + 1 < unique.length ? unique[i + 1].start : Math.min(allText.length, start + 2000);
  unique[i].rawText = allText.substring(start, end).trim();
}

// 第三步：从rawText中解析音标、词性、释义、例句
unique.forEach(e => {
  const text = e.rawText;
  
  // 提取音标：/xxx/ 格式（可能有多个，取第一个）
  const phoneticMatch = text.match(/\/([^\n\/]{2,40})\//);
  e.phonetic = phoneticMatch ? '/' + phoneticMatch[1].trim() + '/' : '';
  
  // 提取词性：n. v. adj. adv. prep. conj. pron. art. num. etc.
  const posMatch = text.match(/(?:^|\s)((?:n|v|adj|adv|prep|conj|pron|art|num|aux|abbr|int|vt|vi|modal)\.)/);
  e.pos = posMatch ? posMatch[1] : '';
  
  // 提取中文释义：在词性标记后面找中文字符
  // 中文释义通常在音标和词性之后
  const meaningMatch = text.match(/(?:n|v|adj|adv|prep|conj|pron|art|num|aux|abbr|int|vt|vi|modal\.)\s*([^\n]*?[\u4e00-\u9fff][^\n]*)/);
  if (meaningMatch) {
    e.meaning = meaningMatch[1].trim();
  } else {
    // 尝试直接找中文
    const cnMatch = text.match(/([\u4e00-\u9fff][^\n]{2,80})/);
    e.meaning = cnMatch ? cnMatch[1].trim() : '';
  }
  
  // 提取例句：英文句子（长度>15，包含空格）
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  e.examples = lines.filter(l => {
    // 英文例句特征：以大写字母开头，包含空格，长度>15
    if (l.length < 15) return false;
    if (!/^[A-Z""'(\[]/.test(l)) return false;
    // 排除词条行本身
    if (new RegExp(`^\\s*\\d+`).test(l)) return false;
    // 包含空格（多词句子）
    if (!/\s/.test(l)) return false;
    // 排除全是OCR乱码的
    const letters = l.match(/[a-zA-Z]/g);
    if (!letters || letters.length < 5) return false;
    return true;
  }).slice(0, 3);  // 最多取3个例句
});

// 按number排序
unique.sort((a, b) => a.number - b.number);

// 统计
let noPhonetic = unique.filter(x => !x.phonetic);
let noPos = unique.filter(x => !x.pos);
let noMeaning = unique.filter(x => !x.meaning);
let noExamples = unique.filter(x => x.examples.length === 0);

console.log('从OCR提取的词条数:', unique.length);
console.log('有音标:', unique.length - noPhonetic.length, '  无音标:', noPhonetic.length);
console.log('有词性:', unique.length - noPos.length, '  无词性:', noPos.length);
console.log('有释义:', unique.length - noMeaning.length, '  无释义:', noMeaning.length);
console.log('有例句:', unique.length - noExamples.length, '  无例句:', noExamples.length);

console.log('---');
console.log('无释义的词:', noMeaning.map(x => `${x.number}.${x.word}`).join(', '));
console.log('---');
console.log('前3个词条样本:');
unique.slice(0, 3).forEach(x => {
  console.log(`  ${x.number}. ${x.word} ${x.phonetic} ${x.pos} ${x.meaning}`);
  console.log(`    例句: ${x.examples.length}个`);
  x.examples.forEach(ex => console.log(`      - ${ex.substring(0, 80)}`));
});

// 保存
fs.writeFileSync('Gemini/ocr_extracted_full.json', JSON.stringify(unique, null, 2), 'utf8');
console.log('已保存: Gemini/ocr_extracted_full.json');
