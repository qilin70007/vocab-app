const fs = require('fs');
const path = require('path');

const queue = JSON.parse(fs.readFileSync(path.join(__dirname, 'translation_queue.json'), 'utf-8'));
const results = JSON.parse(fs.readFileSync(path.join(__dirname, 'translation_results.json'), 'utf-8'));

// Find which items still need translation
const processedWords = new Set(results.map(r => r.word));
const remaining = queue.filter(item => {
  if (!processedWords.has(item.word)) return true;
  // Also re-include ones that got the MYMEMORY WARNING
  const r = results.find(r => r.word === item.word);
  return r && r.translated && r.translated.includes('MYMEMORY WARNING');
});

// Pick clean sentences
function pickSentences(text) {
  const sentences = text.match(/[A-Z"'][^.!?]*[.!?]/g) || [];
  const good = sentences.filter(s => {
    const trimmed = s.trim();
    if (trimmed.length < 15) return false;
    if (/\b(n\.|v\.|adj\.|adv\.|pl\.)\b.*\//.test(trimmed)) return false;
    if (/[A-Z][a-z]+ \/[a-z]/.test(trimmed)) return false;
    return true;
  });
  return good.slice(0, 2).join(' ');
}

const toTranslate = [];
for (const item of remaining) {
  if (!item.cleaned || item.cleaned.length < 15) continue;
  const english = pickSentences(item.cleaned);
  if (english && english.length > 15) {
    toTranslate.push({
      word: item.word,
      index: item.index,
      english: english
    });
  }
}

// Output as JSON array for batch translation
fs.writeFileSync(
  path.join(__dirname, 'to_translate.json'),
  JSON.stringify(toTranslate, null, 2),
  'utf-8'
);

console.log(`Remaining to translate: ${toTranslate.length}`);
console.log(`Already done: ${results.length - 3} good + 3 warning + 2 skip = ${results.length}`);
console.log(`Saved to to_translate.json`);

// Print first 5 for verification
toTranslate.slice(0, 5).forEach(t => console.log(`  ${t.word}: ${t.english}`));
