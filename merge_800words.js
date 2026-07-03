// Merge words from 800词 PDF into the existing words.json
const fs = require('fs');
const path = require('path');

const existing = JSON.parse(fs.readFileSync(path.join(__dirname, 'words.json'), 'utf8'));
const new800 = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/words_800.json'), 'utf8'));

console.log(`Existing words: ${existing.length}`);
console.log(`New 800词 words: ${new800.length}`);

// Create a map of existing words
const existingMap = new Map();
for (const w of existing) {
  existingMap.set(w.word.toLowerCase(), w);
}

// Merge: add new words not in existing
const added = [];
const enriched = []; // words that got enriched with usage info from 800词

for (const w of new800) {
  const key = w.word.toLowerCase();
  if (!existingMap.has(key)) {
    // New word - create a minimal entry matching existing format
    added.push({
      word: w.word,
      phonetic: '',
      pos: w.pos || '',
      meaning: w.meaning.replace(/___/g, '___'),
      forms: w.variant ? [{ form: w.variant, desc: '变体' }] : [],
      collocations: w.usage ? w.usage.split(';').map(s => s.trim()).filter(Boolean).map(s => ({ eng: s, chn: '' })) : [],
      examples: [],
      section: w.word[0].toUpperCase(),
      source: '800词'
    });
  } else {
    // Existing word - enrich with usage/collocation info if available
    const existing_w = existingMap.get(key);
    if (w.usage && !existing_w.collocations?.length) {
      existing_w.collocations = w.usage.split(';').map(s => s.trim()).filter(Boolean).map(s => ({ eng: s, chn: '' }));
      enriched.push(key);
    }
  }
}

console.log(`New words to add: ${added.length}`);
console.log(`Existing words enriched: ${enriched.length}`);

// Show new words sample
console.log('\nNew words sample:');
added.slice(0, 10).forEach(w => {
  console.log(`  ${w.word} [${w.pos}] ${w.meaning.substring(0, 40)}`);
});

// Merge and sort
const merged = [...existing, ...added].sort((a, b) => a.word.localeCompare(b.word));

// Reassign section based on first letter
for (const w of merged) {
  w.section = w.word[0].toUpperCase();
}

console.log(`\nTotal merged words: ${merged.length}`);

// Save
fs.writeFileSync(path.join(__dirname, 'words.json'), JSON.stringify(merged, null, 2), 'utf8');
console.log('Saved to words.json');

// Also update progress.json for new words
const progressPath = path.join(__dirname, 'data/progress.json');
if (fs.existsSync(progressPath)) {
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  for (const w of added) {
    if (!progress[w.word]) {
      progress[w.word] = { status: 'new', lastReview: null, reviewCount: 0 };
    }
  }
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');
  console.log(`Updated progress.json (${Object.keys(progress).length} entries)`);
}
