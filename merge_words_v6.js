const fs = require('fs');

// Navigate step by step using readdirSync to avoid path encoding issues
const tinaContents = fs.readdirSync('E:\\Tina');
console.log('E:\\Tina contents:', tinaContents.length, 'items');

let projectFolder = null;
for (const dir of tinaContents) {
  // Check if this directory has a 'data' subdirectory with 'words.json'
  try {
    const subContents = fs.readdirSync('E:\\Tina\\' + dir);
    if (subContents.includes('data')) {
      const dataContents = fs.readdirSync('E:\\Tina\\' + dir + '\\data');
      if (dataContents.includes('words.json')) {
        projectFolder = dir;
        console.log('Found project folder:', dir);
        break;
      }
    }
  } catch(e) {
    // Not a directory or access denied, skip
  }
}

if (!projectFolder) {
  console.error('Could not find project folder!');
  process.exit(1);
}

const basePath = 'E:\\Tina\\' + projectFolder;
const originalPath = basePath + '\\data\\words.json';
const ocrPath = basePath + '\\ocr_parsed_words_v2.json';
const mergedPath = basePath + '\\merged_words.json';

console.log('Reading from:', originalPath);

const originalWords = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
console.log('Original words:', originalWords.length);

const ocrWords = JSON.parse(fs.readFileSync(ocrPath, 'utf8'));
console.log('OCR words:', ocrWords.length);

// Create lookup map
const originalMap = new Map();
for (const w of originalWords) {
  const key = w.word.toLowerCase();
  if (!originalMap.has(key)) {
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
    definition: original ? (original.definition || '') : '',
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
