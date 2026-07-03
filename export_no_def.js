const fs = require('fs');

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
const finalWords = JSON.parse(fs.readFileSync(basePath + '\\final_words.json', 'utf8'));

const noDef = finalWords.filter(w => !w.definition || w.definition.length === 0);
console.log('Words without definition:', noDef.length);

// Export as simple list for translation
const list = noDef.map(w => ({
  word: w.word,
  phonetic: w.phonetic,
  pos: w.pos
}));

fs.writeFileSync(basePath + '\\words_need_translation.json', JSON.stringify(list, null, 2), 'utf8');
console.log('Exported to words_need_translation.json');
console.log('\nFirst 50:');
noDef.slice(0, 50).forEach((w, i) => {
  console.log(`${i+1}. ${w.word} [${w.pos}] ${w.phonetic}`);
});
