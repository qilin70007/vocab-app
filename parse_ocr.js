/**
 * 解析OCR文本文件，提取单词信息，更新words.json
 * 
 * OCR格式分析：
 * > 102. *attractive /əˈtræktɪv/ adj. 吸引人的
 * 例句行（英文+中文）
 * 派生词块：word pos. meaning
 * 搭配块：短语 中文
 * 页码行：数字（如 21）
 */

const fs = require('fs');
const path = require('path');

const OCR_DIR = 'E:/Tina/自研背单词软件/ocr_output';
const WORDS_FILE = 'E:/Tina/自研背单词软件/words.json';
const OUTPUT_FILE = 'E:/Tina/自研背单词软件/words_enhanced.json';

// 读取所有OCR文本
const ocrFiles = fs.readdirSync(OCR_DIR)
  .filter(f => f.startsWith('page_') && f.endsWith('.txt'))
  .sort();

let allText = '';
for (const f of ocrFiles) {
  allText += fs.readFileSync(path.join(OCR_DIR, f), 'utf8') + '\n';
}

// 按行分割，过滤页码行和空行
const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

// 解析每个单词条目
// 主词条格式：> NUMBER. [*|**|***]WORD /PHONETIC/ POS. MEANING
// 或不带>前缀：NUMBER. [*|**|***]WORD /PHONETIC/ POS. MEANING

const entries = [];
let currentEntry = null;

// 主词条正则：可选>前缀，编号，可选星号标记，单词，音标(可选)，词性+释义
const mainEntryRegex = /^>?\s*(\d+)[.,]?\s*\**\s*([a-zA-Z][a-zA-Z\-'\s]*?)\s*(?:\/([^\/]+)\/)?\s*((?:adj\.|adv\.|n\.|v\.|v\.&\s*n\.|conj\.|prep\.|pron\.|art\.|num\.|int\.|aux\.|vt\.|vi\.|vt\.&\s*vi\.|linking\s*v\.|modal\s*v\..*?))\s+(.+)/;
// 有些词条只有词性没有音标，有些没有音标和词性
const mainEntryRegex2 = /^>?\s*(\d+)[.,]?\s*\**\s*([a-zA-Z][a-zA-Z\-'\s]*?)\s+(?:\/([^\/]+)\/\s+)?(.+)/;
// 派生词行：word pos. meaning  或  word n. meaning
const derivRegex = /^([a-zA-Z][a-zA-Z\-']*?)\s+((?:adj\.|adv\.|n\.|v\.|vt\.|vi\.|conj\.|prep\.|pron\.|art\.|num\.|int\.|aux\.|linking\s*v\.|modal\s*v\.))\s+(.+)/;
// 搭配/短语行：通常没有编号，包含中文或特定格式
const phraseRegex = /^(be\s+\w+|have\s+\w+|take\s+\w+|make\s+\w+|give\s+\w+|keep\s+\w+|go\s+\w+|get\s+\w+|on\s+\w+|in\s+\w+|at\s+\w+|by\s+\w+|for\s+\w+|to\s+\w+|of\s+\w+|with\s+\w+|do\s+\w+|[\w\s]+)\s+(.+)/;

function isPageNumber(line) {
  return /^\d{1,3}$/.test(line) && parseInt(line) < 400;
}

function isMainEntry(line) {
  return /^>?\s*\d+[.,]?\s*\**\s*[a-zA-Z]/.test(line);
}

function extractStarLevel(text) {
  const match = text.match(/^>?\s*\d+[.,]?\s*(\*{0,3})/);
  return match ? match[1].length : 0;
}

function parseMainEntry(line) {
  // 去掉>前缀
  let text = line.replace(/^>\s*/, '');
  
  // 提取编号
  const numMatch = text.match(/^(\d+)[.,]?\s*/);
  if (!numMatch) return null;
  text = text.substring(numMatch[0].length);
  
  // 提取星号级别
  const starMatch = text.match(/^(\*{0,3})\s*/);
  const starLevel = starMatch ? starMatch[1].length : 0;
  text = text.substring(starMatch[0].length);
  
  // 提取音标 /.../
  let phonetic = '';
  const phonMatch = text.match(/^\/([^\/]+)\/\s*/);
  if (phonMatch) {
    phonetic = phonMatch[1].trim();
    text = text.substring(phonMatch[0].length);
  }
  
  // 提取单词（到音标或词性之前的部分）
  // 如果没有音标，单词就是到词性标记之前的部分
  // 如果有音标，单词是音标前的部分... 不对，格式是 word /phon/ pos. meaning
  // 重新处理：在去掉>和编号后，格式是 [*]word /phon/ pos. meaning 或 [*]word pos. meaning
  
  // 重新来：去掉星号后的原文
  let remaining = text;
  
  // 尝试匹配 word /phon/ pos meaning
  // word 可能包含空格（如 a bit of）或连字符
  // 先尝试有音标的情况
  if (phonetic) {
    // 音标前就是单词
    // 但我们已经把音标去掉了...重新从原始text处理
    remaining = text; // 音标已经被去掉了，remaining是pos+meaning
  } else {
    // 没有音标，需要分离word和pos+meaning
  }
  
  // 回溯：重新从去掉星号后的text处理
  remaining = text;
  
  // 尝试提取音标
  const phonMatch2 = remaining.match(/^\/([^\/]+)\/\s*/);
  let word = '';
  if (phonMatch2) {
    // 有音标 - 但单词在音标前面... 
    // 不对，格式是：word /phon/ pos meaning
    // 我们去掉了星号，remaining = "word /phon/ pos meaning"
    // 但上面已经提取了音标并从text中删除了...
    // 重新处理
    phonetic = phonMatch2[1].trim();
    // 音标之前的部分是单词
    const idx = remaining.indexOf('/');
    word = remaining.substring(0, idx).trim();
    remaining = remaining.substring(phonMatch2[0].length);
  } else {
    // 没有音标，尝试分离单词和词性
    // 词性标记列表
    const posRegex = /^([a-zA-Z][a-zA-Z\-'\s]*?)\s+((?:adj\.|adv\.|n\.|v\.|vt\.|vi\.|conj\.|prep\.|pron\.|art\.|num\.|int\.|aux\.|linking\s*v\.|modal\s*v\.)(?:&\s*(?:n\.|v\.|adj\.|adv\.|pron\.|conj\.|prep\.))*)\s+(.+)/;
    const posMatch = remaining.match(posRegex);
    if (posMatch) {
      word = posMatch[1].trim();
      remaining = posMatch[2] + ' ' + posMatch[3];
    } else {
      // 无法解析，整个作为word
      word = remaining;
      remaining = '';
    }
  }
  
  // 清理单词
  word = word.replace(/\s+/g, ' ').trim();
  
  // 从remaining提取词性和释义
  let pos = '';
  let meaning = '';
  const posExtractRegex = /^((?:adj\.|adv\.|n\.|v\.|vt\.|vi\.|conj\.|prep\.|pron\.|art\.|num\.|int\.|aux\.|linking\s*v\.|modal\s*v\.)(?:&\s*(?:n\.|v\.|adj\.|adv\.|pron\.|conj\.|prep\.))*)\s*(.+)/;
  const posExtract = remaining.match(posExtractRegex);
  if (posExtract) {
    pos = posExtract[1].trim();
    meaning = posExtract[2].trim();
  } else {
    meaning = remaining.trim();
  }
  
  // 处理括号中的不规则变化：word (flew, flown) 
  const irregularMatch = word.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  let forms = [];
  if (irregularMatch) {
    word = irregularMatch[1].trim();
    // 不规则变化形式
    const formParts = irregularMatch[2].split(',').map(s => s.trim());
    for (const fp of formParts) {
      const parts = fp.split(/\s+/);
      if (parts.length >= 2) {
        forms.push({ form: parts[0], desc: parts.slice(1).join(' ') });
      } else {
        forms.push({ form: fp, desc: '不规则变化' });
      }
    }
  }
  
  return {
    number: parseInt(numMatch[1]),
    word: word,
    phonetic: phonetic,
    pos: pos,
    meaning: meaning,
    starLevel: starLevel,
    forms: forms,
    collocations: [],
    examples: [],
    derivatives: []
  };
}

function parseDerivativeLine(line) {
  // 格式：word pos. meaning 或 word n. meaning
  const match = line.match(/^([a-zA-Z][a-zA-Z\-']*?)\s+((?:adj\.|adv\.|n\.|v\.|vt\.|vi\.|conj\.|prep\.|pron\.|art\.|num\.|int\.|aux\.|linking\s*v\.|modal\s*v\.)(?:&\s*(?:n\.|v\.|adj\.|adv\.|pron\.|conj\.|prep\.))*)\s+(.+)/);
  if (match) {
    return {
      word: match[1].trim(),
      pos: match[2].trim(),
      meaning: match[3].trim()
    };
  }
  return null;
}

function cleanMeaning(text) {
  // 清理OCR产生的噪声
  return text
    .replace(/\s+/g, ' ')
    .trim();
}

function isChinese(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

function isMixedContent(text) {
  // 包含中文和英文的行（例句或释义）
  return isChinese(text) && /[a-zA-Z]/.test(text);
}

function isExampleLine(line, currentWord) {
  // 例句行通常包含完整英文句子
  // 不以词性标记开头，不是派生词，不是页码
  if (isPageNumber(line)) return false;
  if (isMainEntry(line)) return false;
  
  // 排除派生词行
  if (parseDerivativeLine(line)) return false;
  
  // 排除特定标记行
  if (/^[=>]/.test(line)) return false;
  if (line.startsWith('★') || line.startsWith('&')) return false;
  
  // 包含中文翻译的英文句子
  if (isMixedContent(line) && line.length > 15) return true;
  
  // 纯英文句子（较长）
  if (/^[A-Z]/.test(line) && line.length > 15 && !currentWord) return false;
  
  return false;
}

// 处理所有行
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // 跳过页码行
  if (isPageNumber(line)) continue;
  
  // 检查是否是主词条
  if (isMainEntry(line)) {
    const entry = parseMainEntry(line);
    if (entry) {
      if (currentEntry) {
        entries.push(currentEntry);
      }
      currentEntry = entry;
      continue;
    }
  }
  
  // 如果有当前词条，处理附加信息
  if (currentEntry) {
    // 跳过标记行
    if (line.startsWith('★') || line.startsWith('&')) continue;
    if (line.startsWith('=') || line.startsWith('~')) continue;
    
    // 尝试解析为派生词
    const deriv = parseDerivativeLine(line);
    if (deriv) {
      currentEntry.derivatives.push(deriv);
      continue;
    }
    
    // 尝试解析为搭配/短语
    // 搭配行通常较短，包含中文
    if (isChinese(line) && line.length < 50 && !line.includes('.')) {
      currentEntry.collocations.push({
        eng: line,
        chn: ''
      });
      continue;
    }
    
    // 中英混合行 - 可能是例句或搭配
    if (isMixedContent(line)) {
      if (line.length > 20) {
        // 例句
        currentEntry.examples.push(line);
      } else {
        // 短搭配
        currentEntry.collocations.push({
          eng: line,
          chn: ''
        });
      }
      continue;
    }
    
    // 纯英文行 - 可能是例句的一部分
    if (/^[A-Z]/.test(line) && line.length > 15) {
      currentEntry.examples.push(line);
      continue;
    }
  }
}

// 推入最后一个条目
if (currentEntry) {
  entries.push(currentEntry);
}

console.log(`解析完成：共 ${entries.length} 个词条`);

// 按编号排序
entries.sort((a, b) => a.number - b.number);

// 统计
let withPhonetic = 0, withExamples = 0, withDerivatives = 0, withCollocations = 0;
for (const e of entries) {
  if (e.phonetic) withPhonetic++;
  if (e.examples.length > 0) withExamples++;
  if (e.derivatives.length > 0) withDerivatives++;
  if (e.collocations.length > 0) withCollocations++;
}

console.log(`有音标: ${withPhonetic} (${(withPhonetic/entries.length*100).toFixed(1)}%)`);
console.log(`有例句: ${withExamples} (${(withExamples/entries.length*100).toFixed(1)}%)`);
console.log(`有派生词: ${withDerivatives} (${(withDerivatives/entries.length*100).toFixed(1)}%)`);
console.log(`有搭配: ${withCollocations} (${(withCollocations/entries.length*100).toFixed(1)}%)`);

// 输出前5个条目作为预览
console.log('\n--- 前5个条目预览 ---');
for (let i = 0; i < Math.min(5, entries.length); i++) {
  console.log(JSON.stringify(entries[i], null, 2));
}

// 保存解析结果
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(entries, null, 2), 'utf8');
console.log(`\n已保存到: ${OUTPUT_FILE}`);
