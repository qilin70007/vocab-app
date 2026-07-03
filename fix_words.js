const fs = require('fs');
const path = require('path');

const wordsPath = 'E:/Tina/自研背单词软件/words.json';
const words = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

let fixCount = 0;
let fixes = {
  phoneticOld: 0,
  phoneticEmpty: 0,
  garbledCollocations: 0,
  garbledMeanings: 0,
  emptyForms: 0,
};

// Dictionary of phonetic fixes for common words that have old-style or empty phonetics
// Using standard IPA format
const phoneticFixes = {
  'ability': '[ˈæbɪləti]',
  'accurately': '[ˈækjərətli]',
  'advertiser': '[ˈædvətaɪzə(r)]',
  'awfully': '[ˈɔːfli]',
  'battle': '[ˈbætl]',
  'adult': '[ˈædʌlt]',
  'advise': '[ədˈvaɪz]',
  'afford': '[əˈfɔːd]',
  'africa': '[ˈæfrɪkə]',
  'alarm': '[əˈlɑːm]',
  // We'll handle the rest programmatically
};

// Common phonetic conversions from old format to new
function fixPhonetic(word, phonetic) {
  if (!phonetic || phonetic === '') {
    // Try to look up from our fixes dictionary
    if (phoneticFixes[word.toLowerCase()]) return phoneticFixes[word.toLowerCase()];
    return null; // Can't fix without data
  }
  
  // Already in new format
  if (phonetic.startsWith('[') && phonetic.endsWith(']')) {
    return phonetic;
  }
  
  // Old format: 'əbiləti -> convert to [ˈæbɪləti]
  // The old format uses apostrophes for stress marks instead of ˈ
  // We can't perfectly convert without a proper dictionary, but we can fix the format
  let fixed = phonetic;
  
  // Replace leading apostrophe with [ and add stress mark
  if (fixed.startsWith("'")) {
    fixed = fixed.substring(1);
    fixed = '[ˈ' + fixed;
  } else {
    fixed = '[' + fixed;
  }
  
  // Close bracket if not present
  if (!fixed.endsWith(']')) {
    fixed = fixed + ']';
  }
  
  // Common replacements for old phonetic symbols
  fixed = fixed.replace(/ə/g, 'ə'); // already correct
  fixed = fixed.replace(/ɪ/g, 'ɪ'); // already correct
  fixed = fixed.replace(/ʧ/g, 'tʃ');
  fixed = fixed.replace(/ʤ/g, 'dʒ');
  fixed = fixed.replace(/ʊ/g, 'ʊ');
  fixed = fixed.replace(/ŋ/g, 'ŋ');
  fixed = fixed.replace(/ɑː/g, 'ɑː');
  fixed = fixed.replace(/ɔː/g, 'ɔː');
  fixed = fixed.replace(/ɜː/g, 'ɜː');
  fixed = fixed.replace(/iː/g, 'iː');
  fixed = fixed.replace(/uː/g, 'uː');
  fixed = fixed.replace(/θ/g, 'θ');
  fixed = fixed.replace(/ð/g, 'ð');
  fixed = fixed.replace(/ʃ/g, 'ʃ');
  fixed = fixed.replace(/ʒ/g, 'ʒ');
  
  return fixed;
}

// Fix garbled collocations by replacing ___ with the word itself
function fixCollocations(word, collocations) {
  if (!collocations || !collocations.length) return collocations;
  
  let fixed = false;
  const newColls = collocations.map(c => {
    if (!c.eng) return c;
    if (c.eng.includes('___')) {
      fixed = true;
      const newEng = c.eng.replace(/___/g, word);
      return { ...c, eng: newEng };
    }
    // Also fix patterns like "___t" which seem to be "word + t"
    if (c.eng.includes('___t ')) {
      fixed = true;
      const newEng = c.eng.replace(/___t /g, word + 't ');
      return { ...c, eng: newEng };
    }
    return c;
  });
  
  if (fixed) fixes.garbledCollocations++;
  return newColls;
}

// Fix garbled meanings by replacing ___ with the word itself
function fixMeaning(word, meaning) {
  if (!meaning) return meaning;
  if (meaning.includes('___')) {
    fixes.garbledMeanings++;
    return meaning.replace(/___/g, word);
  }
  return meaning;
}

// Process all words
const fixedWords = words.map(w => {
  let fixed = { ...w };
  let changed = false;
  
  // Fix phonetic
  if (!fixed.phonetic || fixed.phonetic === '' || !fixed.phonetic.startsWith('[')) {
    const newPh = fixPhonetic(fixed.word, fixed.phonetic);
    if (newPh && newPh !== fixed.phonetic) {
      fixed.phonetic = newPh;
      changed = true;
      if (!w.phonetic || w.phonetic === '') fixes.phoneticEmpty++;
      else fixes.phoneticOld++;
    }
  }
  
  // Fix garbled collocations
  if (fixed.collocations && fixed.collocations.length) {
    const newColls = fixCollocations(fixed.word, fixed.collocations);
    if (newColls !== fixed.collocations) {
      fixed.collocations = newColls;
      changed = true;
    }
  }
  
  // Fix garbled meanings
  if (fixed.meaning && fixed.meaning.includes('___')) {
    fixed.meaning = fixMeaning(fixed.word, fixed.meaning);
    changed = true;
  }
  
  if (changed) fixCount++;
  
  return fixed;
});

console.log('Fix summary:');
console.log(JSON.stringify(fixes, null, 2));
console.log('Total words fixed:', fixCount);

// Save backup
fs.writeFileSync(
  path.join(path.dirname(wordsPath), 'words.backup.json'),
  JSON.stringify(words, null, 2),
  'utf-8'
);
console.log('Backup saved as words.backup.json');

// Save fixed words
fs.writeFileSync(wordsPath, JSON.stringify(fixedWords, null, 2), 'utf-8');
console.log('Fixed words saved');

// Verify
const verify = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));
let remainingIssues = {
  oldPhonetic: 0,
  emptyPhonetic: 0,
  garbledColl: 0,
  garbledMeaning: 0,
};
verify.forEach(w => {
  if (!w.phonetic) remainingIssues.emptyPhonetic++;
  else if (!w.phonetic.startsWith('[')) remainingIssues.oldPhonetic++;
  if (w.collocations && w.collocations.some(c => c.eng && c.eng.includes('___'))) remainingIssues.garbledColl++;
  if (w.meaning && w.meaning.includes('___')) remainingIssues.garbledMeaning++;
});
console.log('\nRemaining issues after fix:');
console.log(JSON.stringify(remainingIssues, null, 2));
