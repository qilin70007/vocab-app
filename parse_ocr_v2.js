/**
 * 解析OCR文本 - V2
 * 精确匹配格式模式
 * 
 * 主词条格式变体：
 * > 102. *attractive /o'trektrv/ adj. 中文
 * 103. audience /'s:dions/n. 中文
 * > 105. aunt /ant/n. 中文
 * 154. being /"bismn/ n. 中文
 * 
 * 有些词条有>前缀，有些没有
 * 星号0-3个
 * 音标在两个/之间
 * 词性标记：adj. adv. n. v. conj. prep. pron. art. num. int. aux. vt. vi. 等
 * 
 * 附加信息：
 * - 派生词行：word pos. meaning
 * - 例句行：英文句子 + 中文翻译
 * - 搭配/短语
 * - 页码行：纯数字
 * - 标记行：& WBE, = WER, os RE 等
 */

const fs = require('fs');
const path = require('path');

const OCR_DIR = 'E:/Tina/自研背单词软件/ocr_output';
const OUTPUT_FILE = 'E:/Tina/自研背单词软件/words_enhanced.json';

const ocrFiles = fs.readdirSync(OCR_DIR)
  .filter(f => f.startsWith('page_') && f.endsWith('.txt'))
  .sort();

let allText = '';
for (const f of ocrFiles) {
  allText += fs.readFileSync(path.join(OCR_DIR, f), 'utf8') + '\n';
}

const lines = allText.split('\n').map(l => l.trim());

// 词性标记正则
const POS_PATTERN = '(?:adj\\.?|adv\\.?|n\\.?|v\\.?|vt\\.?|vi\\.?|conj\\.?|prep\\.?|pron\\.?|art\\.?|num\\.?|int\\.?|aux\\.?|linking\\s*v\\.?|modal\\s*v\\.?)';
// 复合词性：v.&n. adj.&n. 等
const POS_FULL = `${POS_PATTERN}(?:\\s*&\\s*${POS_PATTERN})*`;

/**
 * 尝试匹配主词条
 * 格式：[>] NUMBER. [*] WORD /PHONETIC/ POS. MEANING
 * 或：[>] NUMBER. [*] WORD /PHONETIC/POS.MEANING  (无空格变体)
 * 或：[>] NUMBER. [*] WORD POS. MEANING (无音标)
 */
function tryParseMainEntry(line) {
  // 去掉各种前缀：>, =k >, =, 等
  let text = line.replace(/^(?:=\w*\s*)?>\s*/, '').replace(/^[=\w]+\s+>\s*/, '').replace(/^>\s*/, '');
  
  // 匹配编号
  const numMatch = text.match(/^(\d+)[.,]?\s*/);
  if (!numMatch) return null;
  text = text.substring(numMatch[0].length);
  const number = parseInt(numMatch[1]);
  
  // 提取星号和前导引号
  const starMatch = text.match(/^(\*{0,3}\s*'*\s*)/);
  if (!starMatch) return null;
  const starLevel = (starMatch[1].match(/\*/g) || []).length;
  text = text.substring(starMatch[0].length);
  
  // 现在text应该是: WORD /PHONETIC/ POS MEANING 或 WORD POS MEANING
  
  // 尝试匹配音标：/.../
  // 音标可能包含各种特殊字符
  const phonMatch = text.match(/^(\S+)\s+\/([^\/]+)\/\s*/);
  let word = '';
  let phonetic = '';
  let remaining = '';
  
  if (phonMatch) {
    word = phonMatch[1].trim();
    phonetic = phonMatch[2].trim();
    remaining = text.substring(phonMatch[0].length);
  } else {
    // 没有音标，尝试匹配 WORD POS MEANING
    // 需要找到词性标记的位置
    const posRegex = new RegExp(`^(.+?)\\s+((${POS_FULL})\\.?)\\s+(.+)`);
    const posMatch = text.match(posRegex);
    if (posMatch) {
      word = posMatch[1].trim();
      remaining = posMatch[2] + ' ' + posMatch[4];
    } else {
      // 无法解析
      return null;
    }
  }
  
  // 从remaining提取词性和释义
  let pos = '';
  let meaning = '';
  const posExtractRegex = new RegExp(`^((${POS_FULL})\\.?)\\s*(.+)`);
  const posExtract = remaining.match(posExtractRegex);
  if (posExtract) {
    pos = posExtract[1].trim();
    meaning = posExtract[3].trim();
  } else {
    meaning = remaining.trim();
  }
  
  // 处理不规则变化：word (flew, flown) 或 word (babies)
  const irregularMatch = word.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  let forms = [];
  if (irregularMatch) {
    word = irregularMatch[1].trim();
    const formParts = irregularMatch[2].split(/[,.]/).map(s => s.trim()).filter(s => s);
    for (const fp of formParts) {
      forms.push({ form: fp, desc: '不规则变化' });
    }
  }
  
  // 清理word中的OCR垃圾字符（如®、©、前导引号等）
  word = word.replace(/^[^a-zA-Z]+/, '').replace(/[^a-zA-Z\-'\s]/g, '').trim();
  
  // 验证word是合法的英文单词
  if (!/^[a-zA-Z][a-zA-Z\-'\s]*$/.test(word) || word.length < 1) {
    return null;
  }
  
  return {
    number,
    word: word.replace(/\s+/g, ' ').trim(),
    phonetic,
    pos,
    meaning,
    starLevel,
    forms,
    collocations: [],
    examples: [],
    derivatives: []
  };
}

/**
 * 判断是否是主词条行
 */
function isMainEntryLine(line) {
  if (!line) return false;
  // 去掉各种前缀后检查
  const text = line.replace(/^(?:=\w*\s*)?>\s*/, '').replace(/^[=\w]+\s+>\s*/, '').replace(/^>\s*/, '').replace(/^[=\w]+\s+/, '');
  // 允许编号后跟 * 和/或 ' 再跟字母
  return /^\d+[.,]?\s*\*{0,3}\s*['a-zA-Z]/.test(text);
}

/**
 * 判断是否是页码行
 */
function isPageNumber(line) {
  return /^\d{1,3}$/.test(line) && parseInt(line) < 400;
}

/**
 * 尝试解析派生词行
 * 格式：word pos. meaning
 * 如：attractive adj. 中文
 *     automatically adv. 中文
 *     n. 中文  (接续上一个派生词的word)
 */
function tryParseDerivative(line) {
  // 完整派生词行：word pos. meaning
  const match = line.match(new RegExp(`^([a-zA-Z][a-zA-Z\\-']*?)\\s+((${POS_FULL})\\.?)\\s+(.+)`));
  if (match) {
    return {
      word: match[1].trim(),
      pos: match[2].trim(),
      meaning: match[4].trim()
    };
  }
  // 只有词性的行（接续）：n. 中文
  const posOnly = line.match(new RegExp(`^((${POS_FULL})\\.?)\\s+(.+)`));
  if (posOnly) {
    return {
      word: '',
      pos: posOnly[1].trim(),
      meaning: posOnly[2].trim()
    };
  }
  return null;
}

/**
 * 判断是否是标记/分隔行
 */
function isMarkerLine(line) {
  // 常见标记：& WBE, = WER, os RE, o& ETE 等
  // 这些是OCR识别的符号标记
  if (/^[=&]\s/.test(line)) return true;
  if (/^[=&]$/.test(line)) return true;
  if (/^os\s/.test(line)) return true;
  if (/^[ow]r?[es]?\s/.test(line) && line.length < 10) return true;
  // 箭头标记
  if (/^[=>]/.test(line)) return true;
  // 分隔线
  if (/^[-=]{3,}/.test(line)) return true;
  // 短中文行（可能是标记）
  if (/^[\u4e00-\u9fff]{1,3}$/.test(line)) return true;
  return false;
}

/**
 * 判断是否是例句行
 */
function isExampleLine(line) {
  if (!line || line.length < 10) return false;
  // 以大写字母开头的英文句子，或包含中文的英文句子
  if (/^[A-Z][a-zA-Z]/.test(line) && line.length > 15) return true;
  // 中英混合
  if (/[\u4e00-\u9fff]/.test(line) && /[a-zA-Z]{3,}/.test(line) && line.length > 15) return true;
  return false;
}

/**
 * 判断是否是搭配/短语行
 */
function isCollocationLine(line) {
  // 较短的中英混合行
  if (/[\u4e00-\u9fff]/.test(line) && /[a-zA-Z]/.test(line) && line.length < 50 && line.length > 5) {
    return true;
  }
  // 纯英文短语
  if (/^[a-z]/.test(line) && line.length < 50 && !line.match(new RegExp(POS_FULL))) {
    return true;
  }
  return false;
}

// 处理所有行
const entries = [];
let currentEntry = null;
let lastDerivWord = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // 跳过页码行
  if (isPageNumber(line)) continue;
  
  // 检查是否是主词条
  if (isMainEntryLine(line)) {
    const entry = tryParseMainEntry(line);
    if (entry) {
      if (currentEntry) {
        entries.push(currentEntry);
      }
      currentEntry = entry;
      lastDerivWord = '';
      continue;
    }
  }
  
  // 如果有当前词条，处理附加信息
  if (currentEntry) {
    // 跳过标记行
    if (isMarkerLine(line)) {
      // 但有些标记行后面跟的是搭配信息
      continue;
    }
    
    // 尝试解析为派生词
    const deriv = tryParseDerivative(line);
    if (deriv && deriv.word) {
      currentEntry.derivatives.push(deriv);
      lastDerivWord = deriv.word;
      continue;
    }
    
    // 例句行
    if (isExampleLine(line)) {
      currentEntry.examples.push(line);
      continue;
    }
    
    // 搭配行
    if (isCollocationLine(line)) {
      currentEntry.collocations.push({
        eng: line,
        chn: ''
      });
      continue;
    }
  }
}

if (currentEntry) {
  entries.push(currentEntry);
}

// 去重：同一编号只保留第一个
const seen = new Set();
const deduped = [];
for (const e of entries) {
  const key = `${e.number}_${e.word}`;
  if (!seen.has(key)) {
    seen.add(key);
    deduped.push(e);
  }
}

// 按编号排序
deduped.sort((a, b) => a.number - b.number);

console.log(`解析完成：共 ${deduped.length} 个词条（去重前 ${entries.length}）`);

// 统计
let withPhonetic = 0, withExamples = 0, withDerivatives = 0, withCollocations = 0, withPos = 0, withMeaning = 0;
for (const e of deduped) {
  if (e.phonetic) withPhonetic++;
  if (e.examples.length > 0) withExamples++;
  if (e.derivatives.length > 0) withDerivatives++;
  if (e.collocations.length > 0) withCollocations++;
  if (e.pos) withPos++;
  if (e.meaning) withMeaning++;
}

const total = deduped.length;
console.log(`有音标: ${withPhonetic} (${(withPhonetic/total*100).toFixed(1)}%)`);
console.log(`有词性: ${withPos} (${(withPos/total*100).toFixed(1)}%)`);
console.log(`有释义: ${withMeaning} (${(withMeaning/total*100).toFixed(1)}%)`);
console.log(`有例句: ${withExamples} (${(withExamples/total*100).toFixed(1)}%)`);
console.log(`有派生词: ${withDerivatives} (${(withDerivatives/total*100).toFixed(1)}%)`);
console.log(`有搭配: ${withCollocations} (${(withCollocations/total*100).toFixed(1)}%)`);

// 预览前10个
console.log('\n--- 前10个条目 ---');
for (let i = 0; i < Math.min(10, deduped.length); i++) {
  const e = deduped[i];
  console.log(`#${e.number} ${e.word} /${e.phonetic}/ ${e.pos} ${e.meaning?.substring(0, 30)}... | examples: ${e.examples.length} | deriv: ${e.derivatives.length}`);
}

// 预览中间几个
console.log('\n--- 第100-105个条目 ---');
for (let i = 100; i < Math.min(105, deduped.length); i++) {
  const e = deduped[i];
  console.log(`#${e.number} ${e.word} /${e.phonetic}/ ${e.pos} ${e.meaning?.substring(0, 30)}... | examples: ${e.examples.length} | deriv: ${e.derivatives.length}`);
}

// 保存
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(deduped, null, 2), 'utf8');
console.log(`\n已保存到: ${OUTPUT_FILE}`);
