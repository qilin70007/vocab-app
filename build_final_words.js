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

// Load all three sources
const originalWords = JSON.parse(fs.readFileSync(basePath + '\\words.json', 'utf8'));
const ocrWords = JSON.parse(fs.readFileSync(basePath + '\\ocr_parsed_words_v2.json', 'utf8'));
const extractedWords = JSON.parse(fs.readFileSync(basePath + '\\extracted_words.json', 'utf8'));

console.log('Original words:', originalWords.length);
console.log('OCR words:', ocrWords.length);
console.log('Extracted words:', extractedWords.length);

// Build final word list
// Strategy: 
// 1. Start with OCR words (have English data: phonetic, examples, phrases)
// 2. Match with original words for Chinese definitions
// 3. Add extracted words (manually verified, high quality)
// 4. Add any original words not covered
// 5. Deduplicate by word (case-insensitive)

const finalMap = new Map(); // key: lowercase word

// Helper to add or merge a word entry
function addWord(entry) {
  const key = (entry.word || '').toLowerCase().trim();
  if (!key) return;
  
  if (finalMap.has(key)) {
    // Merge with existing
    const existing = finalMap.get(key);
    if (!existing.definition && entry.definition) existing.definition = entry.definition;
    if (!existing.phonetic && entry.phonetic) existing.phonetic = entry.phonetic;
    if (!existing.pos && entry.pos) existing.pos = entry.pos;
    if (entry.examples && Array.isArray(entry.examples) && entry.examples.length > 0) {
      const exExamples = Array.isArray(existing.examples) ? existing.examples : [];
      existing.examples = [...new Set([...exExamples, ...entry.examples])];
    }
    if (entry.phrases && Array.isArray(entry.phrases) && entry.phrases.length > 0) {
      const exPhrases = Array.isArray(existing.phrases) ? existing.phrases : [];
      existing.phrases = [...new Set([...exPhrases, ...entry.phrases])];
    }
    if (entry.forms && Array.isArray(entry.forms) && entry.forms.length > 0) {
      const existingForms = Array.isArray(existing.forms) ? existing.forms : [];
      existing.forms = [...new Set([...existingForms, ...entry.forms])];
    }
    if (!existing.notes && entry.notes) existing.notes = entry.notes;
  } else {
    finalMap.set(key, { ...entry });
  }
}

// 1. Add extracted words first (highest quality, manually verified)
for (const w of extractedWords) {
  addWord({
    word: w.word,
    phonetic: w.phonetic || '',
    pos: w.pos || '',
    definition: w.definition || w.meaning || '',
    examples: w.examples || [],
    phrases: w.phrases || [],
    forms: w.forms || [],
    notes: w.notes || '',
    source: 'extracted'
  });
}
console.log('After extracted:', finalMap.size);

// 2. Add original words (have Chinese definitions)
for (const w of originalWords) {
  addWord({
    word: w.word,
    phonetic: w.phonetic || '',
    pos: w.pos || '',
    definition: w.definition || w.meaning || '',
    examples: w.examples || [],
    phrases: w.phrases || (w.collocations || []).map(c => c.eng),
    forms: (w.forms || []).map(f => f.form + (f.desc ? ' (' + f.desc + ')' : '')),
    notes: '',
    source: 'original'
  });
}
console.log('After original:', finalMap.size);

// 3. Add OCR words (have English examples, phonetic)
for (const w of ocrWords) {
  addWord({
    word: w.word,
    phonetic: w.phonetic || '',
    pos: w.pos || '',
    definition: w.definition || '',
    examples: w.examples || [],
    phrases: w.phrases || [],
    forms: w.forms || [],
    notes: w.notes || '',
    source: 'ocr'
  });
}
console.log('After OCR:', finalMap.size);

// Convert to array and sort alphabetically
const finalWords = Array.from(finalMap.values());
finalWords.sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()));

// Clean up: remove source field, ensure all fields exist
for (const w of finalWords) {
  delete w.source;
  w.examples = w.examples || [];
  w.phrases = w.phrases || [];
  w.forms = w.forms || [];
  w.phonetic = w.phonetic || '';
  w.pos = w.pos || '';
  w.definition = w.definition || '';
  w.notes = w.notes || '';
}

// Write output
fs.writeFileSync(basePath + '\\final_words.json', JSON.stringify(finalWords, null, 2), 'utf8');
console.log('\nFinal words:', finalWords.length);

// Statistics
const withDef = finalWords.filter(w => w.definition && !isGarbled(w.definition)).length;
const withPhonetic = finalWords.filter(w => w.phonetic).length;
const withPos = finalWords.filter(w => w.pos).length;
const withExamples = finalWords.filter(w => w.examples.length > 0).length;
const withPhrases = finalWords.filter(w => w.phrases.length > 0).length;
const withForms = finalWords.filter(w => w.forms.length > 0).length;

function isGarbled(str) {
  // Check if string is mostly garbled (non-readable characters from OCR)
  const garbled = str.replace(/[a-zA-Z0-9\u4e00-\u9fff\s.,;:!?'"\/\-\(\)\[\]{}]/g, '');
  return garbled.length > str.length * 0.3;
}

console.log('\n--- Final Statistics ---');
console.log('Total words:', finalWords.length);
console.log('With definition:', withDef, `(${(withDef/finalWords.length*100).toFixed(1)}%)`);
console.log('With phonetic:', withPhonetic, `(${(withPhonetic/finalWords.length*100).toFixed(1)}%)`);
console.log('With POS:', withPos, `(${(withPos/finalWords.length*100).toFixed(1)}%)`);
console.log('With examples:', withExamples, `(${(withExamples/finalWords.length*100).toFixed(1)}%)`);
console.log('With phrases:', withPhrases);
console.log('With forms:', withForms);

// Show first and last words
console.log('\nFirst 5:', finalWords.slice(0, 5).map(w => w.word).join(', '));
console.log('Last 5:', finalWords.slice(-5).map(w => w.word).join(', '));

// Show sample entries
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
