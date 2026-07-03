/**
 * 解析OCR文本 - V3
 * 更robust的前缀处理和word清理
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

const POS_PATTERN = '(?:adj\\.?|adv\\.?|n\\.?|v\\.?|vt\\.?|vi\\.?|conj\\.?|prep\\.?|pron\\.?|art\\.?|num\\.?|int\\.?|aux\\.?|linking\\s*v\\.?|modal\\s*v\\.?)';
const POS_FULL = `${POS_PATTERN}(?:\\s*&\\s*${POS_PATTERN})*`;

/**
 * Strip OCR prefix artifacts from a line
 * Handles: >, =k >, == P, =, etc.
 */
function stripOcrPrefix(line) {
  let text = line;
  for (let i = 0; i < 5; i++) {
    const before = text;
    // Remove =word sequences (like "== P", "=k")
    text = text.replace(/^[=\w]+\s+/, '');
    // Remove > prefix
    text = text.replace(/^>\s*/, '');
    // Remove leading = signs
    text = text.replace(/^[=]+\s*/, '');
    if (text === before) break;
  }
  return text.trim();
}

/**
 * Try to parse a main entry line
 */
function tryParseMainEntry(line) {
  const text = stripOcrPrefix(line);
  
  // Match number at start
  const numMatch = text.match(/^(\d+)[.,]?\s*/);
  if (!numMatch) return null;
  let rest = text.substring(numMatch[0].length);
  const number = parseInt(numMatch[1]);
  
  // Extract stars and leading quotes
  const starMatch = rest.match(/^(\*{0,3})\s*['\u2018\u2019\u201C\u201D"']*\s*/);
  if (!starMatch) return null;
  const starLevel = starMatch[1].length;
  rest = rest.substring(starMatch[0].length);
  
  // Try to match: WORD /PHONETIC/ POS MEANING
  let word = '';
  let phonetic = '';
  let remaining = '';
  
  const phonMatch = rest.match(/^(\S+)\s+\/([^\/]+)\/\s*/);
  if (phonMatch) {
    word = phonMatch[1].trim();
    phonetic = phonMatch[2].trim();
    remaining = rest.substring(phonMatch[0].length);
  } else {
    // No phonetic, try WORD POS MEANING
    const posRegex = new RegExp(`^(.+?)\\s+((${POS_FULL})\\.?)\\s+(.+)`);
    const posMatch = rest.match(posRegex);
    if (posMatch) {
      word = posMatch[1].trim();
      remaining = posMatch[2] + ' ' + posMatch[4];
    } else {
      return null;
    }
  }
  
  // Clean word: remove non-alpha chars (OCR artifacts like ®, ©, leading quotes)
  word = word.replace(/^[^a-zA-Z]+/, '').replace(/[^a-zA-Z\-\u2018\u2019\u201C\u201D"'\s]/g, '').trim();
  if (!word || !/^[a-zA-Z]/.test(word)) return null;
  
  // Extract pos and meaning from remaining
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
  
  // Handle irregular forms: word (flew, flown)
  const irregularMatch = word.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  let forms = [];
  if (irregularMatch) {
    word = irregularMatch[1].trim();
    const formParts = irregularMatch[2].split(/[,.]/).map(s => s.trim()).filter(s => s);
    for (const fp of formParts) {
      forms.push({ form: fp, desc: '不规则变化' });
    }
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

function isMainEntryLine(line) {
  if (!line) return false;
  const text = stripOcrPrefix(line);
  return /^\d+[.,]?\s*\*{0,3}\s*['\u2018\u2019\u201C\u201D"a-zA-Z]/.test(text);
}

function isPageNumber(line) {
  return /^\d{1,3}$/.test(line) && parseInt(line) < 400;
}

function tryParseDerivative(line) {
  const match = line.match(new RegExp(`^([a-zA-Z][a-zA-Z\\-']*?)\\s+((${POS_FULL})\\.?)\\s+(.+)`));
  if (match) {
    return { word: match[1].trim(), pos: match[2].trim(), meaning: match[4].trim() };
  }
  const posOnly = line.match(new RegExp(`^((${POS_FULL})\\.?)\\s+(.+)`));
  if (posOnly) {
    return { word: '', pos: posOnly[1].trim(), meaning: posOnly[2].trim() };
  }
  return null;
}

function isMarkerLine(line) {
  if (/^[=&]\s/.test(line)) return true;
  if (/^[=&]$/.test(line)) return true;
  if (/^os\s/.test(line)) return true;
  if (/^[ow]r?[es]?\s/.test(line) && line.length < 10) return true;
  if (/^[=>]/.test(line)) return true;
  if (/^[-=]{3,}/.test(line)) return true;
  if (/^[\u4e00-\u9fff]{1,3}$/.test(line)) return true;
  return false;
}

function isExampleLine(line) {
  if (!line || line.length < 10) return false;
  if (/^[A-Z][a-zA-Z]/.test(line) && line.length > 15) return true;
  if (/[\u4e00-\u9fff]/.test(line) && /[a-zA-Z]{3,}/.test(line) && line.length > 15) return true;
  return false;
}

function isCollocationLine(line) {
  if (/[\u4e00-\u9fff]/.test(line) && /[a-zA-Z]/.test(line) && line.length < 50 && line.length > 5) return true;
  if (/^[a-z]/.test(line) && line.length < 50 && !line.match(new RegExp(POS_FULL))) return true;
  return false;
}

// Process all lines
const entries = [];
let currentEntry = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  if (isPageNumber(line)) continue;
  
  if (isMainEntryLine(line)) {
    const entry = tryParseMainEntry(line);
    if (entry) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = entry;
      continue;
    }
  }
  
  if (currentEntry) {
    if (isMarkerLine(line)) continue;
    
    const deriv = tryParseDerivative(line);
    if (deriv && deriv.word) {
      currentEntry.derivatives.push(deriv);
      continue;
    }
    
    if (isExampleLine(line)) {
      currentEntry.examples.push(line);
      continue;
    }
    
    if (isCollocationLine(line)) {
      currentEntry.collocations.push({ eng: line, chn: '' });
      continue;
    }
  }
}

if (currentEntry) entries.push(currentEntry);

// Dedupe by number_word
const seen = new Set();
const deduped = [];
for (const e of entries) {
  const key = `${e.number}_${e.word}`;
  if (!seen.has(key)) {
    seen.add(key);
    deduped.push(e);
  }
}
deduped.sort((a, b) => a.number - b.number);

console.log(`解析完成：共 ${deduped.length} 个词条（去重前 ${entries.length}）`);

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

// Check specific words
const checkWords = ['a', 'about', 'after', 'ability', 'animal', 'answer', 'advise', 'air'];
console.log('\n--- Check specific words ---');
for (const w of checkWords) {
  const found = deduped.find(e => e.word.toLowerCase() === w);
  console.log(`${w}: ${found ? `FOUND #${found.number}, examples=${found.examples.length}` : 'NOT FOUND'}`);
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(deduped, null, 2), 'utf8');
console.log(`\n已保存到: ${OUTPUT_FILE}`);
