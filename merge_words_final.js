const fs = require('fs');

// The words.json is in the project root, not in data/
// Let's use the approach that works: readdirSync to navigate

const tinaContents = fs.readdirSync('E:\\Tina');

let projectFolder = null;
for (const dir of tinaContents) {
  try {
    const subContents = fs.readdirSync('E:\\Tina\\' + dir);
    // Look for words.json in the root of the folder
    if (subContents.includes('words.json') && subContents.includes('ocr_parsed_words_v2.json')) {
      projectFolder = dir;
      break;
    }
  } catch(e) {}
}

if (!projectFolder) {
  console.error('Could not find project folder!');
  process.exit(1);
}

const basePath = 'E:\\Tina\\' + projectFolder;
console.log('Project:', basePath);

const originalPath = basePath + '\\words.json';
const ocrPath = basePath + '\\ocr_parsed_words_v2.json';
const mergedPath = basePath + '\\merged_words.json';

const originalWords = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
console.log('Original words:', originalWords.length);
console.log('Sample original word:', JSON.stringify(originalWords[0]).substring(0, 200));

const ocrWords = JSON.parse(fs.readFileSync(ocrPath, 'utf8'));
console.log('OCR words:', ocrWords.length);

// Check original word structure
if (originalWords[0]) {
  console.log('\nOriginal word keys:', Object.keys(originalWords[0]));
}

// Create lookup map
const originalMap = new Map();
for (const w of originalWords) {
  const key = (w.word || '').toLowerCase();
  if (key && !originalMap.has(key)) {
    originalMap.set(key, w);
  }
}

// Merge
const mergedWords = [];
let matchedCount = 0;
let unmatchedCount = 0;

for (const ocrWord of ocrWords) {
  const key = ocrWord.word.toLowerCase().trim();
  const original = originalMap.get(key);
  
  const merged = {
    number: ocrWord.number,
    word: ocrWord.word,
    phonetic: ocrWord.phonetic,
    pos: ocrWord.pos || (original ? original.pos : '') || '',
    definition: original ? (original.definition || original.meaning || '') : '',
    examples: ocrWord.examples || [],
    phrases: ocrWord.phrases || [],
    forms: ocrWord.forms || [],
    notes: ocrWord.notes || ''
  };
  
  if (original && original.examples && merged.examples.length === 0) {
    merged.examples = original.examples;
  }
  if (original && original.phrases && original.phrases.length > 0) {
    merged.phrases = [...new Set([...merged.phrases, ...original.phrases])];
  }
  if (original && original.forms && original.forms.length > 0) {
    merged.forms = [...new Set([...merged.forms, ...original.forms])];
  }
  
  if (original) {
    matchedCount++;
  } else {
    unmatchedCount++;
    if (!merged.definition && ocrWord.definition) {
      merged.definition = ocrWord.definition;
    }
  }
  
  mergedWords.push(merged);
}

fs.writeFileSync(mergedPath, JSON.stringify(mergedWords, null, 2), 'utf8');
console.log('\nMerged words:', mergedWords.length);
console.log('Matched (has Chinese def):', matchedCount);
console.log('Unmatched:', unmatchedCount);
console.log('Match rate:', (matchedCount / mergedWords.length * 100).toFixed(1) + '%');

// Show unmatched samples
const unmatchedWords = mergedWords.filter((w, i) => {
  const ocrWord = ocrWords[i];
  return !originalMap.has(ocrWord.word.toLowerCase().trim());
});
console.log('\n--- First 30 unmatched words ---');
for (const w of unmatchedWords.slice(0, 30)) {
  console.log(`  #${w.number} ${w.word} [${w.pos}] def: "${w.definition.substring(0, 50)}"`);
}

// Also check: words in original not in OCR
const ocrWordSet = new Set(ocrWords.map(w => w.word.toLowerCase().trim()));
const extraOriginal = originalWords.filter(w => !ocrWordSet.has((w.word || '').toLowerCase()));
console.log(`\nWords in original but not in OCR: ${extraOriginal.length}`);
console.log('First 10:', extraOriginal.slice(0, 10).map(w => w.word).join(', '));
