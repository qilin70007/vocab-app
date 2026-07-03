const fs = require('fs');
const words = JSON.parse(fs.readFileSync('./words.json', 'utf-8'));

// Merge duplicates: keep the one with more detail
const merged = {};
for (const w of words) {
  const key = w.word.toLowerCase();
  if (!merged[key]) {
    merged[key] = w;
  } else {
    const existing = merged[key];
    // Keep the entry with more collocations/examples/forms
    const existingDetail = (existing.collocations?.length || 0) + (existing.examples?.length || 0) + (existing.forms?.length || 0);
    const newDetail = (w.collocations?.length || 0) + (w.examples?.length || 0) + (w.forms?.length || 0);
    
    if (newDetail > existingDetail) {
      // Merge: keep richer meaning, combine collocations/forms/examples
      merged[key] = {
        ...w,
        meaning: w.meaning.length > existing.meaning.length ? w.meaning : existing.meaning,
        collocations: [...new Set([...(existing.collocations || []), ...(w.collocations || [])])],
        forms: [...new Set([...(existing.forms || []), ...(w.forms || [])])],
        examples: [...(existing.examples || []), ...(w.examples || [])],
        exampleCn: [...(existing.exampleCn || []), ...(w.exampleCn || [])]
      };
    } else {
      // Keep existing but merge in extra data from new
      merged[key] = {
        ...existing,
        meaning: existing.meaning.length > w.meaning.length ? existing.meaning : w.meaning,
        collocations: [...new Set([...(existing.collocations || []), ...(w.collocations || [])])],
        forms: [...new Set([...(existing.forms || []), ...(w.forms || [])])],
        examples: [...(existing.examples || []), ...(w.examples || [])],
        exampleCn: [...(existing.exampleCn || []), ...(w.exampleCn || [])]
      };
    }
  }
}

const result = Object.values(merged);
// Sort alphabetically
result.sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()));

fs.writeFileSync('./words.json', JSON.stringify(result, null, 2), 'utf-8');
console.log(`Before: ${words.length}, After: ${result.length}, Removed: ${words.length - result.length} duplicates`);
