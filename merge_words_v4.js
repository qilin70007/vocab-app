const fs = require('fs');
const path = require('path');

// List E:\Tina and find our project folder dynamically
const tinaContents = fs.readdirSync('E:\\Tina');
console.log('Tina contents:', tinaContents);

// Find folder containing data/words.json
let BASE = null;
for (const dir of tinaContents) {
  const candidate = path.join('E:\\Tina', dir);
  try {
    const stat = fs.statSync(candidate);
    if (stat.isDirectory()) {
      const wordsPath = path.join(candidate, 'data', 'words.json');
      if (fs.existsSync(wordsPath)) {
        BASE = candidate;
        console.log('Found project at:', BASE);
        break;
      }
    }
  } catch(e) {}
}

if (!BASE) {
  console.error('Could not find project folder!');
  // Try listing all subdirectories
  for (const dir of tinaContents) {
    const candidate = path.join('E:\\Tina', dir);
    try {
      const stat = fs.statSync(candidate);
      if (stat.isDirectory()) {
        const contents = fs.readdirSync(candidate);
        console.log(`  ${dir}/ => ${contents.slice(0, 5).join(', ')}`);
      }
    } catch(e) {}
  }
  process.exit(1);
}

const originalPath = path.join(BASE, 'data', 'words.json');
const ocrPath = path.join(BASE, 'ocr_parsed_words_v2.json');
const mergedPath = path.join(BASE, 'merged_words.json');

console.log('Original path:', originalPath);
console.log('OCR path:', ocrPath);

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
