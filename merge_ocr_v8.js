/**
 * 合并OCR数据到words.json - V8
 * 
 * words.json中forms是array, collocations是array, examples是array
 * 需要正确处理数组类型
 */

const fs = require('fs');

const WORDS_PATH = 'E:/Tina/自研背单词软件/words.json';
const OCR_PATH = 'E:/Tina/自研背单词软件/words_enhanced.json';
const OUTPUT_PATH = 'E:/Tina/自研背单词软件/words_merged_v8.json';

const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'));
const ocrEntries = JSON.parse(fs.readFileSync(OCR_PATH, 'utf8'));

console.log(`words.json: ${words.length} words`);
console.log(`OCR entries: ${ocrEntries.length} entries`);

const ocrMap = new Map();
for (const e of ocrEntries) {
  const key = e.word.toLowerCase().trim();
  if (!ocrMap.has(key)) {
    ocrMap.set(key, e);
  } else {
    const existing = ocrMap.get(key);
    existing.examples.push(...e.examples);
    existing.derivatives.push(...e.derivatives);
    existing.collocations.push(...e.collocations);
  }
}
console.log(`OCR unique words: ${ocrMap.size}`);

function hasContent(val) {
  if (!val) return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'string') {
    const t = val.trim();
    return t.length > 0 && !/^[_\s-]+$/.test(t);
  }
  return false;
}

function hasIPA(phon) {
  if (!phon) return false;
  return /[əːˈˌæɪɒɑʊɛɔɪʌθðʃʒŋ]/.test(phon);
}

function isValidExample(text) {
  if (!text || text.length < 10) return false;
  const ascii = (text.match(/[a-zA-Z]/g) || []).length;
  if (ascii < 5) return false;
  if (!/[.!?]/.test(text) && text.length < 30) return false;
  return true;
}

let stats = { matched: 0, unmatched: 0, exAdded: 0, formsAdded: 0, collsAdded: 0, posAdded: 0 };

// Track before state
const beforeStats = { forms: 0, colls: 0, examples: 0 };
for (const w of words) {
  if (hasContent(w.forms)) beforeStats.forms++;
  if (hasContent(w.collocations)) beforeStats.colls++;
  if (hasContent(w.examples)) beforeStats.examples++;
}
console.log('\n--- Before merge ---');
console.log(`Forms: ${beforeStats.forms}, Collocations: ${beforeStats.colls}, Examples: ${beforeStats.examples}`);

for (const w of words) {
  const key = w.word.toLowerCase().trim();
  const ocr = ocrMap.get(key);
  
  if (!ocr) { stats.unmatched++; continue; }
  stats.matched++;
  
  // pos
  if (!hasContent(w.pos) && hasContent(ocr.pos)) {
    w.pos = ocr.pos;
    stats.posAdded++;
  }
  
  // forms: w.forms is array of {form, desc}
  if (!hasContent(w.forms) && ocr.derivatives && ocr.derivatives.length > 0) {
    const newForms = [];
    for (const d of ocr.derivatives) {
      if (d.word && d.word.trim()) {
        newForms.push({ form: d.word, desc: d.pos || '' });
      }
    }
    if (newForms.length > 0) {
      w.forms = newForms;
      stats.formsAdded++;
    }
  }
  
  // collocations: w.collocations is array of {eng, chn}
  if (!hasContent(w.collocations) && ocr.collocations && ocr.collocations.length > 0) {
    const newColls = ocr.collocations
      .filter(c => {
        const text = typeof c === 'string' ? c : (c.eng || '');
        return text.length > 2;
      })
      .map(c => ({
        eng: typeof c === 'string' ? c : (c.eng || ''),
        chn: ''
      }));
    if (newColls.length > 0) {
      w.collocations = newColls;
      stats.collsAdded++;
    }
  }
  
  // examples: w.examples is array of strings
  if (!hasContent(w.examples) && ocr.examples && ocr.examples.length > 0) {
    const newEx = ocr.examples
      .filter(isValidExample)
      .map(e => e.replace(/\s+/g, ' ').trim())
      .filter(e => e.length > 5);
    if (newEx.length > 0) {
      w.examples = newEx;
      stats.exAdded++;
    }
  }
}

console.log('\n--- Merge Results (V8) ---');
console.log(`Matched: ${stats.matched} / ${words.length}`);
console.log(`Unmatched: ${stats.unmatched}`);
console.log(`New examples added: ${stats.exAdded}`);
console.log(`New forms added: ${stats.formsAdded}`);
console.log(`New collocations added: ${stats.collsAdded}`);
console.log(`POS added: ${stats.posAdded}`);

// Quality
let q = { phonetic: 0, meaning: 0, forms: 0, collocations: 0, examples: 0, allFive: 0 };
for (const w of words) {
  const h = {
    phonetic: hasIPA(w.phonetic),
    meaning: hasContent(w.meaning),
    forms: hasContent(w.forms),
    collocations: hasContent(w.collocations),
    examples: hasContent(w.examples)
  };
  if (h.phonetic) q.phonetic++;
  if (h.meaning) q.meaning++;
  if (h.forms) q.forms++;
  if (h.collocations) q.collocations++;
  if (h.examples) q.examples++;
  if (Object.values(h).every(v => v)) q.allFive++;
}
const t = words.length;
console.log('\n--- Final Quality ---');
console.log(`Total: ${t}`);
console.log(`Phonetic (IPA): ${q.phonetic} (${(q.phonetic/t*100).toFixed(1)}%)`);
console.log(`Meaning: ${q.meaning} (${(q.meaning/t*100).toFixed(1)}%)`);
console.log(`Forms: ${q.forms} (${(q.forms/t*100).toFixed(1)}%)`);
console.log(`Collocations: ${q.collocations} (${(q.collocations/t*100).toFixed(1)}%)`);
console.log(`Examples: ${q.examples} (${(q.examples/t*100).toFixed(1)}%)`);
console.log(`All 5: ${q.allFive} (${(q.allFive/t*100).toFixed(1)}%)`);

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(words, null, 2), 'utf8');
console.log(`\nSaved to: ${OUTPUT_PATH}`);

// Unmatched words
const unmatched = [];
for (const w of words) {
  if (!ocrMap.has(w.word.toLowerCase().trim())) {
    unmatched.push({ word: w.word, hasEx: hasContent(w.examples), hasForms: hasContent(w.forms) });
  }
}
console.log(`\n--- Unmatched: ${unmatched.length} ---`);
const noData = unmatched.filter(u => !u.hasEx && !u.hasForms);
console.log(`Unmatched with no examples AND no forms: ${noData.length}`);
console.log(noData.slice(0, 30).map(u => u.word).join(', '));
