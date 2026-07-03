/**
 * 合并OCR数据到words.json - V7
 * 
 * 在当前words.json（已含v5合并结果）基础上，
 * 只补充之前没有OCR覆盖的词（page 1-27, 259-382对应的词）
 * 
 * 策略：
 * 1. 保留原有所有数据（包括v5已合并的）
 * 2. 对于原有为空的字段，用全量OCR数据补充
 * 3. 不覆盖任何已有数据
 */

const fs = require('fs');

const WORDS_PATH = 'E:/Tina/自研背单词软件/words.json';
const OCR_PATH = 'E:/Tina/自研背单词软件/words_enhanced.json';
const OUTPUT_PATH = 'E:/Tina/自研背单词软件/words_merged_v7.json';

const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'));
const ocrEntries = JSON.parse(fs.readFileSync(OCR_PATH, 'utf8'));

console.log(`words.json: ${words.length} words`);
console.log(`OCR entries: ${ocrEntries.length} entries`);

// Build OCR lookup
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

function hasContent(s) {
  if (!s || typeof s !== 'string') return false;
  const t = s.trim();
  if (t.length === 0) return false;
  if (/^[_\s-]+$/.test(t)) return false;
  return true;
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

function formatExamples(examples) {
  return examples.filter(isValidExample).map(e => e.replace(/\s+/g, ' ').trim()).filter(e => e.length > 5);
}

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

function formatCollocations(collList) {
  if (!collList || collList.length === 0) return '';
  return collList.map(c => typeof c === 'string' ? c : c.eng || '').filter(c => c.length > 2).join('; ');
}

let stats = { matched: 0, unmatched: 0, exAdded: 0, formsAdded: 0, collsAdded: 0, posAdded: 0 };

for (const w of words) {
  const key = w.word.toLowerCase().trim();
  const ocr = ocrMap.get(key);
  
  if (!ocr) { stats.unmatched++; continue; }
  stats.matched++;
  
  // Only fill empty fields - NEVER overwrite existing
  if (!hasContent(w.pos) && hasContent(ocr.pos)) {
    w.pos = ocr.pos;
    stats.posAdded++;
  }
  if (!hasContent(w.forms)) {
    const f = formatForms(ocr.derivatives);
    if (hasContent(f)) { w.forms = f; stats.formsAdded++; }
  }
  if (!hasContent(w.collocations)) {
    const c = formatCollocations(ocr.collocations);
    if (hasContent(c)) { w.collocations = c; stats.collsAdded++; }
  }
  if (!hasContent(w.examples)) {
    const ex = formatExamples(ocr.examples);
    if (ex.length > 0) { w.examples = ex.join('\n'); stats.exAdded++; }
  }
}

console.log('\n--- Merge Results (V7) ---');
console.log(`Matched: ${stats.matched} / ${words.length}`);
console.log(`Unmatched: ${stats.unmatched}`);
console.log(`Examples added: ${stats.exAdded}`);
console.log(`Forms added: ${stats.formsAdded}`);
console.log(`Collocations added: ${stats.collsAdded}`);
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

// Show unmatched words (first 20)
const unmatchedWords = [];
for (const w of words) {
  const key = w.word.toLowerCase().trim();
  if (!ocrMap.has(key)) unmatchedWords.push(w.word);
}
console.log(`\n--- Unmatched words (${unmatchedWords.length}) ---`);
console.log(unmatchedWords.slice(0, 30).join(', '));
console.log('...');

// Check which unmatched words have empty examples
let emptyExUnmatched = 0;
for (const w of words) {
  const key = w.word.toLowerCase().trim();
  if (!ocrMap.has(key) && !hasContent(w.examples)) emptyExUnmatched++;
}
console.log(`\nUnmatched words with empty examples: ${emptyExUnmatched}`);
