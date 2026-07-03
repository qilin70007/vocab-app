const fs = require('fs');

// Navigate to project folder
const tinaContents = fs.readdirSync('E:\\Tina');
let projectFolder = null;
for (const dir of tinaContents) {
  try {
    const subContents = fs.readdirSync('E:\\Tina\\' + dir);
    if (subContents.includes('final_words.json')) {
      projectFolder = dir;
      break;
    }
  } catch(e) {}
}

const basePath = 'E:\\Tina\\' + projectFolder;
console.log('Project:', basePath);

// Load final words
const finalWords = JSON.parse(fs.readFileSync(basePath + '\\final_words.json', 'utf8'));
console.log('Final words:', finalWords.length);

// Format for the app: match the original words.json structure
// Original format: {word, phonetic, pos, meaning, forms, collocations, examples, section, source}
const appWords = finalWords.map((w, i) => {
  // Convert forms array to objects
  const forms = (w.forms || []).map(f => {
    if (typeof f === 'string') {
      const parts = f.split(/\s+/);
      if (parts.length >= 2) {
        return { form: parts[0], desc: parts.slice(1).join(' ') };
      }
      return { form: f, desc: '' };
    }
    return f;
  });
  
  // Convert phrases to collocations
  const collocations = (w.phrases || []).map(p => ({ eng: p, chn: '' }));
  
  return {
    word: w.word,
    phonetic: w.phonetic || '',
    pos: w.pos || '',
    meaning: w.definition || w.notes || '',
    forms: forms,
    collocations: collocations,
    examples: w.examples || [],
    section: w.word[0]?.toUpperCase() || 'A',
    source: 'merged'
  };
});

// Write to app data file
const outputPath = basePath + '\\words.json';
const backupPath = basePath + '\\words_backup_1449.json';

// Backup original
if (!fs.existsSync(backupPath)) {
  const original = fs.readFileSync(outputPath, 'utf8');
  fs.writeFileSync(backupPath, original, 'utf8');
  console.log('Backed up original to words_backup_1449.json');
}

// Write new words
fs.writeFileSync(outputPath, JSON.stringify(appWords, null, 2), 'utf8');
console.log('Updated words.json with', appWords.length, 'words');

// Also update meta.json
const metaPath = basePath + '\\data\\meta.json';
try {
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  meta.totalWords = appWords.length;
  meta.lastUpdated = new Date().toISOString();
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  console.log('Updated meta.json');
} catch(e) {
  console.log('Could not update meta.json:', e.message);
}

console.log('\nDone! The app now has', appWords.length, 'words.');
console.log('Statistics:');
const withMeaning = appWords.filter(w => w.meaning).length;
const withPhonetic = appWords.filter(w => w.phonetic).length;
const withExamples = appWords.filter(w => w.examples && w.examples.length > 0).length;
console.log(`  With Chinese meaning: ${withMeaning} (${(withMeaning/appWords.length*100).toFixed(1)}%)`);
console.log(`  With phonetic: ${withPhonetic} (${(withPhonetic/appWords.length*100).toFixed(1)}%)`);
console.log(`  With examples: ${withExamples} (${(withExamples/appWords.length*100).toFixed(1)}%)`);
