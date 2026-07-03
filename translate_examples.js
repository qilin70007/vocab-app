const fs = require('fs');
const path = require('path');

// Load words.json
const words = JSON.parse(fs.readFileSync(path.join(__dirname, 'words.json'), 'utf-8'));

// Step 1: Clean examples - extract only readable English sentences
function cleanEnglishExample(raw) {
  // Some examples start with OCR artifacts like "ores", "=e", "n.(3E)" etc.
  // Strategy: split by sentences, keep only ones that look like real English
  
  // Remove leading non-English artifacts
  let text = raw.trim();
  
  // Remove patterns like "n.(3E)", "=e", "ores" at the start
  text = text.replace(/^[^A-Za-z"']{0,10}/, '');
  
  // Remove Chinese char ranges, special OCR symbols, standalone caps sequences
  // Keep: English letters, common punctuation, spaces, apostrophes, quotes
  
  // Split by Chinese characters and take only the English parts
  // Also remove sequences of 4+ consecutive uppercase letters (OCR garbage)
  const parts = text.split(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+/);
  
  const cleanedSentences = [];
  for (const part of parts) {
    let p = part.trim();
    // Remove OCR garbage: sequences of random caps+symbols like "4RPFMABKRABAADNRASAHABRS|"
    p = p.replace(/[A-Z]{6,}[^a-z]*/g, ' ');
    // Remove fragments like "424)", "38 Ht m4F", standalone numbers with caps
    p = p.replace(/[0-9]+\)?\s*[A-Z]{2,}[^a-z.!?]*/g, ' ');
    // Remove standalone symbols
    p = p.replace(/[@#|]+/g, ' ');
    // Clean up multiple spaces
    p = p.replace(/\s+/g, ' ').trim();
    
    if (p && p.length > 10 && /[a-z]/.test(p)) {
      // Split into individual sentences
      const sentences = p.match(/[A-Z"][^.!?]*[.!?]/g);
      if (sentences) {
        for (const s of sentences) {
          const trimmed = s.trim();
          // Filter: must have at least 3 words and contain lowercase letters
          const wordCount = trimmed.split(/\s+/).length;
          if (wordCount >= 3 && /[a-z]/.test(trimmed) && trimmed.length > 15) {
            // Check it's not just random caps
            const lowerRatio = (trimmed.match(/[a-z]/g) || []).length / trimmed.length;
            if (lowerRatio > 0.3) {
              cleanedSentences.push(trimmed);
            }
          }
        }
      }
    }
  }
  
  // Dedupe and join
  const unique = [...new Set(cleanedSentences)];
  return unique.join(' ');
}

// Step 2: Process all words
const toTranslate = [];
let alreadyGood = 0;
let noExample = 0;

for (const w of words) {
  if (!w.examples || !w.examples.length || !w.examples[0].trim()) {
    noExample++;
    continue;
  }
  
  const ex = w.examples[0];
  // Check if already has proper Chinese
  if (/[\u4e00-\u9fff]/.test(ex) && !/@|KLAR|[A-Z]{8,}/.test(ex)) {
    alreadyGood++;
    continue;
  }
  
  // Clean the English
  const cleaned = cleanEnglishExample(ex);
  if (cleaned && cleaned.length > 15) {
    toTranslate.push({
      index: words.indexOf(w),
      word: w.word,
      original: ex,
      cleaned: cleaned
    });
  } else {
    // Can't clean, skip but log
    toTranslate.push({
      index: words.indexOf(w),
      word: w.word,
      original: ex,
      cleaned: null,
      needsManualReview: true
    });
  }
}

console.log(`Total words: ${words.length}`);
console.log(`Already good (has Chinese): ${alreadyGood}`);
console.log(`No examples: ${noExample}`);
console.log(`Need translation: ${toTranslate.length}`);
console.log(`\nSample cleaned examples:`);
toTranslate.slice(0, 10).forEach(t => {
  console.log(`  ${t.word}: ${t.cleaned || 'NEEDS REVIEW'}`);
  if (t.cleaned) console.log(`    Original: ${t.original.substring(0, 80)}...`);
});

// Save the list for translation
fs.writeFileSync(
  path.join(__dirname, 'translation_queue.json'),
  JSON.stringify(toTranslate, null, 2),
  'utf-8'
);
console.log(`\nSaved translation queue to translation_queue.json`);
