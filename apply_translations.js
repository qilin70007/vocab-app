const fs = require('fs');
const path = require('path');

const wordsPath = path.join(__dirname, 'words.json');
const words = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

// Load MyMemory results (first 200)
const myMemoryResults = JSON.parse(fs.readFileSync(path.join(__dirname, 'translation_results.json'), 'utf-8'));

// Load batch results
const batchFiles = [];
for (let i = 0; i < 8; i++) {
  const p = path.join(__dirname, `batch_${i}_done.json`);
  if (fs.existsSync(p)) {
    const batch = JSON.parse(fs.readFileSync(p, 'utf-8'));
    batchFiles.push(...batch);
    console.log(`batch_${i}_done.json: ${batch.length} items`);
  } else {
    console.log(`batch_${i}_done.json: NOT FOUND`);
  }
}

console.log(`MyMemory results: ${myMemoryResults.length}`);
console.log(`Batch results: ${batchFiles.length}`);

// Build translation map
const translations = new Map();

// Add MyMemory results (skip warnings)
for (const r of myMemoryResults) {
  if (r.status === 'ok' && r.translated && !r.translated.includes('MYMEMORY WARNING')) {
    translations.set(r.word, { english: r.english, chinese: r.translated });
  }
}

// Add batch results (override MyMemory if exists)
for (const b of batchFiles) {
  if (b.chinese && b.chinese.length > 1) {
    translations.set(b.word, { english: b.english, chinese: b.chinese });
  }
}

console.log(`Total translations available: ${translations.size}`);

// Apply to words.json
let updated = 0;
let unchanged = 0;
let alreadyGood = 0;

for (let i = 0; i < words.length; i++) {
  const w = words[i];
  
  // Skip if already has good Chinese
  if (w.examples && w.examples[0] && /[\u4e00-\u9fff]/.test(w.examples[0]) && !/@|KLAR|[A-Z]{8,}/.test(w.examples[0])) {
    alreadyGood++;
    continue;
  }
  
  // Find translation
  const trans = translations.get(w.word);
  if (trans) {
    const newExample = `${trans.english} ${trans.chinese}`;
    w.examples = [newExample];
    updated++;
  } else {
    unchanged++;
  }
}

// Backup original
fs.copyFileSync(wordsPath, path.join(__dirname, 'words.json.bak.before_translate'));

// Save
fs.writeFileSync(wordsPath, JSON.stringify(words, null, 2), 'utf-8');

console.log(`\nResults:`);
console.log(`  Already had good Chinese: ${alreadyGood}`);
console.log(`  Updated with translation: ${updated}`);
console.log(`  Unchanged (no translation): ${unchanged}`);
console.log(`  Total words: ${words.length}`);
console.log(`\nBackup saved to words.json.bak.before_translate`);

// Verify
let withCn = 0, withoutCn = 0;
for (const w of words) {
  if (w.examples && w.examples[0] && /[\u4e00-\u9fff]/.test(w.examples[0])) {
    withCn++;
  } else {
    withoutCn++;
  }
}
console.log(`\nVerification: ${withCn} with Chinese, ${withoutCn} without Chinese`);
