const fs = require('fs');

// Navigate to project folder
const tinaContents = fs.readdirSync('E:\\Tina');
let projectFolder = null;
for (const dir of tinaContents) {
  try {
    const subContents = fs.readdirSync('E:\\Tina\\' + dir);
    if (subContents.includes('words.json') && subContents.includes('ocr_parsed_words_v2.json')) {
      projectFolder = dir;
      break;
    }
  } catch(e) {}
}

const basePath = 'E:\\Tina\\' + projectFolder;
console.log('Project:', basePath);

const originalWords = JSON.parse(fs.readFileSync(basePath + '\\words.json', 'utf8'));
const ocrWords = JSON.parse(fs.readFileSync(basePath + '\\ocr_parsed_words_v2.json', 'utf8'));
const extractedWords = JSON.parse(fs.readFileSync(basePath + '\\extracted_words.json', 'utf8'));

console.log('Original:', originalWords.length, 'OCR:', ocrWords.length, 'Extracted:', extractedWords.length);

// Build final word list with proper merge priority
// Priority: extracted (manually verified) > original (has Chinese) > OCR (has English examples)
const finalMap = new Map();

function ensureArray(val) {
  if (Array.isArray(val)) return val;
  if (val == null) return [];
  return [String(val)];
}

function addWord(entry, source) {
  const key = (entry.word || '').toLowerCase().trim();
  if (!key) return;
  
  if (finalMap.has(key)) {
    const existing = finalMap.get(key);
    
    // Only fill in missing fields, don't overwrite
    if (!existing.definition && entry.definition) {
      // Only use definition if it's not garbled
      if (!isGarbled(entry.definition)) {
        existing.definition = entry.definition;
      }
    }
    if (!existing.phonetic && entry.phonetic) existing.phonetic = entry.phonetic;
    if (!existing.pos && entry.pos) existing.pos = entry.pos;
    
    // Merge examples (limit total to 5 per word to avoid pollution)
    const exExamples = ensureArray(existing.examples);
    const newExamples = ensureArray(entry.examples).filter(e => 
      e && e.length > 10 && e.length < 300 && isEnglishSentence(e)
    );
    existing.examples = [...new Set([...exExamples, ...newExamples])].slice(0, 5);
    
    // Merge phrases (limit to 10)
    const exPhrases = ensureArray(existing.phrases);
    const newPhrases = ensureArray(entry.phrases).filter(p => p && p.length < 100);
    existing.phrases = [...new Set([...exPhrases, ...newPhrases])].slice(0, 10);
    
    // Merge forms (limit to 10)
    const exForms = ensureArray(existing.forms);
    const newForms = ensureArray(entry.forms).filter(f => f && f.length < 80);
    existing.forms = [...new Set([...exForms, ...newForms])].slice(0, 10);
    
    if (!existing.notes && entry.notes) existing.notes = entry.notes;
  } else {
    // New entry - clean it up
    const clean = {
      word: entry.word,
      phonetic: entry.phonetic || '',
      pos: entry.pos || '',
      definition: entry.definition || '',
      examples: ensureArray(entry.examples).filter(e => 
        e && e.length > 10 && e.length < 300 && isEnglishSentence(e)
      ).slice(0, 5),
      phrases: ensureArray(entry.phrases).filter(p => p && p.length < 100).slice(0, 10),
      forms: ensureArray(entry.forms).filter(f => f && f.length < 80).slice(0, 10),
      notes: entry.notes || ''
    };
    // Don't use garbled definitions
    if (isGarbled(clean.definition)) clean.definition = '';
    finalMap.set(key, clean);
  }
}

function isGarbled(str) {
  if (!str) return false;
  // If string has too many non-readable chars, it's garbled
  const readable = str.replace(/[\x00-\x7F\u4e00-\u9fff]/g, '');
  return readable.length > str.length * 0.2;
}

function isEnglishSentence(str) {
  if (!str || str.length < 10) return false;
  const asciiRatio = str.replace(/[^\x20-\x7E]/g, '').length / str.length;
  return asciiRatio > 0.6 && /[a-zA-Z]{3,}/.test(str);
}

// 1. Add extracted words first (highest quality)
for (const w of extractedWords) {
  addWord({
    word: w.word,
    phonetic: w.phonetic || '',
    pos: w.pos || '',
    definition: w.definition || w.meaning || '',
    examples: w.examples || [],
    phrases: w.phrases || [],
    forms: w.forms || [],
    notes: w.notes || ''
  }, 'extracted');
}
console.log('After extracted:', finalMap.size);

// 2. Add original words (have Chinese definitions)
for (const w of originalWords) {
  const forms = ensureArray(w.forms).map(f => {
    if (typeof f === 'string') return f;
    if (f.form) return f.form + (f.desc ? ' (' + f.desc + ')' : '');
    return String(f);
  });
  
  const phrases = ensureArray(w.collocations).map(c => {
    if (typeof c === 'string') return c;
    return c.eng || '';
  }).filter(p => p);
  
  addWord({
    word: w.word,
    phonetic: w.phonetic || '',
    pos: w.pos || '',
    definition: w.definition || w.meaning || '',
    examples: w.examples || [],
    phrases: phrases,
    forms: forms,
    notes: ''
  }, 'original');
}
console.log('After original:', finalMap.size);

// 3. Add OCR words (have English examples, phonetic)
for (const w of ocrWords) {
  addWord({
    word: w.word,
    phonetic: w.phonetic || '',
    pos: w.pos || '',
    definition: '', // OCR definitions are garbled, don't use
    examples: w.examples || [],
    phrases: w.phrases || [],
    forms: w.forms || [],
    notes: w.notes || ''
  }, 'ocr');
}
console.log('After OCR:', finalMap.size);

// Convert to array and sort
const finalWords = Array.from(finalMap.values());
finalWords.sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()));

// Write output
fs.writeFileSync(basePath + '\\final_words.json', JSON.stringify(finalWords, null, 2), 'utf8');
console.log('\nFinal words:', finalWords.length);

// Statistics
const withDef = finalWords.filter(w => w.definition && w.definition.length > 0).length;
const withPhonetic = finalWords.filter(w => w.phonetic && w.phonetic.length > 0).length;
const withPos = finalWords.filter(w => w.pos && w.pos.length > 0).length;
const withExamples = finalWords.filter(w => w.examples.length > 0).length;
const withPhrases = finalWords.filter(w => w.phrases.length > 0).length;
const withForms = finalWords.filter(w => w.forms.length > 0).length;

console.log('\n--- Final Statistics ---');
console.log('Total words:', finalWords.length);
console.log('With definition:', withDef, `(${(withDef/finalWords.length*100).toFixed(1)}%)`);
console.log('With phonetic:', withPhonetic, `(${(withPhonetic/finalWords.length*100).toFixed(1)}%)`);
console.log('With POS:', withPos, `(${(withPos/finalWords.length*100).toFixed(1)}%)`);
console.log('With examples:', withExamples, `(${(withExamples/finalWords.length*100).toFixed(1)}%)`);
console.log('With phrases:', withPhrases);
console.log('With forms:', withForms);

// Show samples
console.log('\n--- Sample entries ---');
for (const idx of [0, 100, 500, 1000, 1500, finalWords.length-1]) {
  if (finalWords[idx]) {
    const w = finalWords[idx];
    console.log(`\n#${idx + 1}: ${w.word}`);
    console.log(`  phonetic: ${w.phonetic}`);
    console.log(`  pos: ${w.pos}`);
    console.log(`  definition: ${w.definition.substring(0, 60)}`);
    console.log(`  examples: ${w.examples.length}`);
    if (w.examples[0]) console.log(`    ex: ${w.examples[0].substring(0, 80)}`);
    console.log(`  phrases: ${w.phrases.length}`);
    console.log(`  forms: ${w.forms.length}`);
  }
}

// Check for words without definitions (need Chinese translation)
const noDef = finalWords.filter(w => !w.definition || w.definition.length === 0);
console.log(`\n--- ${noDef.length} words without definition ---`);
console.log(noDef.slice(0, 30).map(w => w.word).join(', '));
