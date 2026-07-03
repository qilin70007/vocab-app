// Parse "800词" PDF raw text to extract word entries
const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(path.join(__dirname, 'data/800words_raw.txt'), 'utf8');

// Remove page headers like "第 	1 	页 	共 	90 	页"
let lines = raw.split('\n').filter(line => {
  const trimmed = line.trim();
  // Skip page headers
  if (/^第\s+\d+\s+页\s+共\s+\d+\s+页/.test(trimmed)) return false;
  if (trimmed === '') return false;
  return true;
});

// Parse entries: each starts with a number followed by a word
const entries = [];
let currentEntry = null;

for (const line of lines) {
  // Match pattern: number．word or number. word (Chinese or English period)
  const entryMatch = line.match(/^(\d+)[．.]\s*([a-zA-Z][\w\-']*(?:\s+\([^)]+\))?)\s+(.*)/);
  if (entryMatch) {
    if (currentEntry) {
      entries.push(currentEntry);
    }
    currentEntry = {
      num: parseInt(entryMatch[1]),
      word: entryMatch[2].trim(),
      detail: entryMatch[3].trim()
    };
  } else if (currentEntry) {
    // Continuation line
    currentEntry.detail += ' ' + line.trim();
  }
}
if (currentEntry) entries.push(currentEntry);

console.log(`Parsed ${entries.length} entries from 800词 PDF`);

// Now parse each entry to extract structured info
const words = entries.map(entry => {
  const detail = entry.detail.replace(/\t/g, ' ').replace(/_{2,}/g, '___');
  
  // Try to extract part of speech and meaning
  // Pattern: word (variant) pos．meaning →...
  let posMatch = detail.match(/^(?:\([^)]*\)\s*)?([a-z]+．|n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|art\.|num\.|int\.|interj\.|modal\.|aux\.)/);
  
  let word = entry.word;
  let variant = '';
  let pos = '';
  let meaning = '';
  let usage = '';
  
  // Extract variant in parentheses after word
  const variantMatch = word.match(/^(\S+)\s+\(([^)]+)\)$/);
  if (variantMatch) {
    word = variantMatch[1];
    variant = variantMatch[2];
  }
  
  if (posMatch) {
    pos = posMatch[1].replace('．', '.');
    const rest = detail.substring(posMatch.index + posMatch[0].length);
    // Split by → for usage items
    const parts = rest.split('→').map(s => s.trim()).filter(Boolean);
    meaning = parts[0] || '';
    usage = parts.slice(1).join('; ');
  } else {
    meaning = detail;
  }
  
  return {
    word: word.toLowerCase(),
    variant,
    pos,
    meaning: meaning.replace(/___/g, '___'),
    usage,
    source: '800词'
  };
});

// Deduplicate by word
const seen = new Set();
const unique = [];
for (const w of words) {
  if (!seen.has(w.word)) {
    seen.add(w.word);
    unique.push(w);
  }
}

console.log(`Unique words: ${unique.length}`);

// Show sample
unique.slice(0, 10).forEach(w => {
  console.log(`  ${w.word} [${w.pos}] ${w.meaning.substring(0, 50)}${w.usage ? ' → ' + w.usage.substring(0, 50) : ''}`);
});

// Save
fs.writeFileSync(
  path.join(__dirname, 'data/words_800.json'),
  JSON.stringify(unique, null, 2),
  'utf8'
);
console.log(`Saved to data/words_800.json`);
