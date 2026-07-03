/**
 * 合并OCR数据到words.json - V6
 * 
 * 策略（保守合并）：
 * 1. 音标：保留原有（已是100% IPA），不用OCR的（OCR音标有乱码）
 * 2. 释义：保留原有（OCR中文是乱码）
 * 3. 词性(pos)：保留原有，原有为空时用OCR
 * 4. forms：保留原有，原有为空时用OCR
 * 5. examples：保留原有，原有为空时用OCR的英文例句
 * 6. collocations：保留原有，原有为空时用OCR
 * 
 * 匹配方式：word精确匹配（不区分大小写）
 * 对于OCR中有但words.json中没有的词：跳过（不新增）
 * 对于words.json中有但OCR中没有的词：保留原样
 */

const fs = require('fs');

const WORDS_PATH = 'E:/Tina/自研背单词软件/words.json';
const OCR_PATH = 'E:/Tina/自研背单词软件/words_enhanced.json';
const OUTPUT_PATH = 'E:/Tina/自研背单词软件/words_merged_v6.json';

// Load data
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'));
const ocrEntries = JSON.parse(fs.readFileSync(OCR_PATH, 'utf8'));

console.log(`words.json: ${words.length} words`);
console.log(`OCR entries: ${ocrEntries.length} entries`);

// Build OCR lookup by word (lowercase)
const ocrMap = new Map();
for (const e of ocrEntries) {
  const key = e.word.toLowerCase().trim();
  if (!ocrMap.has(key)) {
    ocrMap.set(key, e);
  } else {
    // If duplicate, merge examples/derivatives
    const existing = ocrMap.get(key);
    existing.examples.push(...e.examples);
    existing.derivatives.push(...e.derivatives);
    existing.collocations.push(...e.collocations);
  }
}

console.log(`OCR unique words: ${ocrMap.size}`);

// Stats
let stats = {
  matched: 0,
  unmatched: 0,
  examplesAdded: 0,
  formsAdded: 0,
  collsAdded: 0,
  posAdded: 0,
  examplesEnhanced: 0,
  formsEnhanced: 0,
  collsEnhanced: 0
};

// Helper: check if string has meaningful content
function hasContent(s) {
  if (!s || typeof s !== 'string') return false;
  const trimmed = s.trim();
  if (trimmed.length === 0) return false;
  // Check if it's just placeholder/marker
  if (/^[_\s-]+$/.test(trimmed)) return false;
  return true;
}

function hasIPA(phon) {
  if (!phon) return false;
  return /[əːˈˌæɪɒɑʊɛɔɪʌθðʃʒŋ]/.test(phon);
}

// Helper: clean OCR English text (remove garbled Chinese-read-as-English)
function cleanOcrEnglish(text) {
  if (!text) return '';
  // Remove obvious OCR artifacts
  let cleaned = text
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
}

// Helper: check if example is valid English
function isValidExample(text) {
  if (!text || text.length < 10) return false;
  // Should have mostly ASCII letters
  const ascii = (text.match(/[a-zA-Z]/g) || []).length;
  if (ascii < 5) return false;
  // Should look like a sentence
  if (!/[.!?]/.test(text) && text.length < 30) return false;
  return true;
}

// Helper: format examples from OCR
function formatExamples(examples) {
  return examples
    .filter(isValidExample)
    .map(cleanOcrEnglish)
    .filter(e => e.length > 5);
}

// Helper: format derivatives as forms
function formatForms(derivatives) {
  if (!derivatives || derivatives.length === 0) return '';
  const parts = [];
  for (const d of derivatives) {
    if (d.word && hasContent(d.word)) {
      parts.push(`${d.word} ${d.pos || ''}`.trim());
    }
  }
  return parts.join('; ');
}

// Helper: format collocations
function formatCollocations(collList) {
  if (!collList || collList.length === 0) return '';
  return collList
    .map(c => typeof c === 'string' ? c : c.eng || '')
    .filter(c => c.length > 2)
    .join('; ');
}

// Process each word
for (const w of words) {
  const key = w.word.toLowerCase().trim();
  const ocr = ocrMap.get(key);
  
  if (!ocr) {
    stats.unmatched++;
    continue;
  }
  
  stats.matched++;
  
  // pos: keep original, fill from OCR if empty
  if (!hasContent(w.pos) && hasContent(ocr.pos)) {
    w.pos = ocr.pos;
    stats.posAdded++;
  }
  
  // forms: keep original, fill from OCR if empty
  if (!hasContent(w.forms)) {
    const ocrForms = formatForms(ocr.derivatives);
    if (hasContent(ocrForms)) {
      w.forms = ocrForms;
      stats.formsAdded++;
    }
  }
  
  // collocations: keep original, fill from OCR if empty
  if (!hasContent(w.collocations)) {
    const ocrColls = formatCollocations(ocr.collocations);
    if (hasContent(ocrColls)) {
      w.collocations = ocrColls;
      stats.collsAdded++;
    }
  }
  
  // examples: keep original, fill from OCR if empty
  if (!hasContent(w.examples)) {
    const ocrExamples = formatExamples(ocr.examples);
    if (ocrExamples.length > 0) {
      w.examples = ocrExamples.join('\n');
      stats.examplesAdded++;
    }
  }
}

console.log('\n--- Merge Results ---');
console.log(`Matched: ${stats.matched} / ${words.length}`);
console.log(`Unmatched: ${stats.unmatched}`);
console.log(`Examples added: ${stats.examplesAdded}`);
console.log(`Forms added: ${stats.formsAdded}`);
console.log(`Collocations added: ${stats.collsAdded}`);
console.log(`POS added: ${stats.posAdded}`);

// Final quality check
let quality = {
  phonetic: 0,
  meaning: 0,
  forms: 0,
  collocations: 0,
  examples: 0,
  allFive: 0
};

for (const w of words) {
  const has = {
    phonetic: hasIPA(w.phonetic),
    meaning: hasContent(w.meaning),
    forms: hasContent(w.forms),
    collocations: hasContent(w.collocations),
    examples: hasContent(w.examples)
  };
  if (has.phonetic) quality.phonetic++;
  if (has.meaning) quality.meaning++;
  if (has.forms) quality.forms++;
  if (has.collocations) quality.collocations++;
  if (has.examples) quality.examples++;
  if (Object.values(has).every(v => v)) quality.allFive++;
}

const t = words.length;
console.log('\n--- Final Quality ---');
console.log(`Total: ${t}`);
console.log(`Phonetic (IPA): ${quality.phonetic} (${(quality.phonetic/t*100).toFixed(1)}%)`);
console.log(`Meaning: ${quality.meaning} (${(quality.meaning/t*100).toFixed(1)}%)`);
console.log(`Forms: ${quality.forms} (${(quality.forms/t*100).toFixed(1)}%)`);
console.log(`Collocations: ${quality.collocations} (${(quality.collocations/t*100).toFixed(1)}%)`);
console.log(`Examples: ${quality.examples} (${(quality.examples/t*100).toFixed(1)}%)`);
console.log(`All 5: ${quality.allFive} (${(quality.allFive/t*100).toFixed(1)}%)`);

// Save
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(words, null, 2), 'utf8');
console.log(`\nSaved to: ${OUTPUT_PATH}`);

// Show some examples of improvements
console.log('\n--- Sample improvements ---');
const samples = ['avoid', 'available', 'young', 'zero', 'zoo', 'abandon', 'ability'];
for (const sw of samples) {
  const w = words.find(x => x.word === sw);
  if (w) {
    const exLen = hasContent(w.examples) ? w.examples.substring(0, 60) : '(empty)';
    const formsLen = hasContent(w.forms) ? w.forms.substring(0, 40) : '(empty)';
    console.log(`${w.word}: phon=[${hasIPA(w.phonetic) ? 'Y' : 'N'}] pos=${w.pos || '(empty)'} forms=${formsLen} examples=${exLen}...`);
  }
}
