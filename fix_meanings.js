const fs = require('fs');
const wordsPath = 'E:/Tina/自研背单词软件/words.json';
const words = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

let fixCount = 0;
const fixes = {
  duplicateMeaning: 0,  // word appears in meaning (e.g. "aloud大声地；出声地 aloud大声地；出声地")
  duplicateInColl: 0,   // word duplicated in collocation
  meaningCleanup: 0,    // general meaning cleanup
};

const fixedWords = words.map(w => {
  let changed = false;
  let fixed = { ...w };
  
  // Fix meaning: remove duplicate patterns
  // Pattern: "meaning1  word meaning1" or "meaning1  word meaning2"
  if (fixed.meaning) {
    let m = fixed.meaning;
    // Check if the word itself appears in the meaning (not as part of another word)
    const wordPattern = new RegExp('\\b' + w.word + '\\b', 'gi');
    if (wordPattern.test(m)) {
      // Split by double spaces or the word itself
      const parts = m.split(/\s{2,}/);
      if (parts.length > 1) {
        // Keep only the first meaningful part
        m = parts[0].trim();
        fixes.duplicateMeaning++;
        changed = true;
        fixed.meaning = m;
      }
    }
    
    // Clean up extra spaces
    if (m !== fixed.meaning) {
      fixed.meaning = m;
    }
  }
  
  // Fix collocations: remove word duplication
  if (fixed.collocations && fixed.collocations.length) {
    const newColls = fixed.collocations.map(c => {
      if (!c.eng) return c;
      let eng = c.eng;
      // Remove patterns where the word appears twice in a row
      const wordPattern = new RegExp('\\b' + w.word + '\\s+' + w.word + '\\b', 'gi');
      if (wordPattern.test(eng)) {
        eng = eng.replace(wordPattern, w.word);
        fixes.duplicateInColl++;
        changed = true;
        return { ...c, eng };
      }
      return c;
    });
    fixed.collocations = newColls;
  }
  
  if (changed) fixCount++;
  return fixed;
});

console.log('Fixes:', JSON.stringify(fixes, null, 2));
console.log('Total words fixed:', fixCount);

// Show some examples
console.log('\nSample fixed meanings:');
fixedWords.filter((w, i) => {
  const orig = words[i].meaning;
  return orig && w.meaning && orig !== w.meaning;
}).slice(0, 10).forEach((w, i) => {
  console.log(`  ${w.word}: "${words.find(x => x.word === w.word).meaning}" -> "${w.meaning}"`);
});

fs.writeFileSync(wordsPath, JSON.stringify(fixedWords, null, 2), 'utf-8');
console.log('\nSaved!');
