const fs = require('fs');

// Load original words (with proper Chinese definitions)
const originalWords = JSON.parse(fs.readFileSync('E:\\Tina\\自研背单词软件\\data\\words.json', 'utf8'));
console.log(`Original words: ${originalWords.length}`);

// Load OCR parsed words
const ocrWords = JSON.parse(fs.readFileSync('E:\\Tina\\自研背单词软件\\ocr_parsed_words_v2.json', 'utf8'));
console.log(`OCR words: ${ocrWords.length}`);

// Create a lookup map from original words (case-insensitive)
const originalMap = new Map();
for (const w of originalWords) {
  const key = w.word.toLowerCase();
  if (!originalMap.has(key)) {
    originalMap.set(key, w);
  }
}

// Merge: use OCR for English data, supplement Chinese definition from original
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
    pos: ocrWord.pos || (original?.pos || ''),
    definition: original?.definition || '',
    examples: ocrWord.examples || [],
    phrases: ocrWord.phrases || [],
    forms: ocrWord.forms || [],
    notes: ocrWord.notes || ''
  };
  
  // If original has examples and OCR doesn't, use original
  if (original?.examples && merged.examples.length === 0) {
    merged.examples = original.examples;
  }
  
  // If original has phrases, merge them
  if (original?.phrases && original.phrases.length > 0) {
    merged.phrases = [...new Set([...merged.phrases, ...original.phrases])];
  }
  
  // If original has forms, merge them
  if (original?.forms && original.forms.length > 0) {
    merged.forms = [...new Set([...merged.forms, ...original.forms])];
  }
  
  if (original) {
    matchedCount++;
  } else {
    unmatchedCount++;
    // For unmatched words, keep OCR definition (might be garbled but better than nothing)
    if (!merged.definition && ocrWord.definition) {
      merged.definition = ocrWord.definition;
    }
  }
  
  mergedWords.push(merged);
}

// Also find words in original that are NOT in OCR (words from pages 1-27)
const ocrWordSet = new Set(ocrWords.map(w => w.word.toLowerCase().trim()));
const extraWords = [];
for (const w of originalWords) {
  if (!ocrWordSet.has(w.word.toLowerCase())) {
    extraWords.push(w);
  }
}
console.log(`Words in original but not in OCR: ${extraWords.length}`);
console.log(`  (These are words from pages 1-27, already in extracted_words.json)`);

// Write merged output
fs.writeFileSync('E:\\Tina\\自研背单词软件\\merged_words.json', JSON.stringify(mergedWords, null, 2), 'utf8');
console.log(`\nMerged words: ${mergedWords.length}`);
console.log(`Matched with original (has Chinese definition): ${matchedCount}`);
console.log(`Unmatched (no Chinese definition): ${unmatchedCount}`);
console.log(`Match rate: ${(matchedCount/mergedWords.length*100).toFixed(1)}%`);

// Show some unmatched words
const unmatched = mergedWords.filter((w, i) => !originalMap.has(ocrWords[i].word.toLowerCase().trim()));
console.log(`\n--- Sample unmatched words ---`);
for (const w of unmatched.slice(0, 20)) {
  console.log(`  #${w.number} ${w.word} ${w.phonetic} [${w.pos}] def: "${w.definition.substring(0, 40)}"`);
}
