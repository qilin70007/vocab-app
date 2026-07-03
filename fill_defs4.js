const fs = require('fs');
const tinaContents = fs.readdirSync('E:\\Tina');
let projectFolder = null;
for (const dir of tinaContents) {
  try {
    const sub = fs.readdirSync('E:\\Tina\\' + dir);
    if (sub.includes('final_words.json')) { projectFolder = dir; break; }
  } catch(e){}
}
const basePath = 'E:\\Tina\\' + projectFolder;

const defs4 = {
  'january': '一月', 'july': '七月', 'june': '六月',
  'november': '十一月', 'october': '十月', 'paris': '巴黎'
};

const words = JSON.parse(fs.readFileSync(basePath + '\\final_words.json', 'utf8'));
let updated = 0;
for (const w of words) {
  if (!w.definition || w.definition.length === 0) {
    const key = w.word.toLowerCase().trim();
    if (defs4[key]) { w.definition = defs4[key]; updated++; }
  }
}
fs.writeFileSync(basePath + '\\final_words.json', JSON.stringify(words, null, 2), 'utf8');

const appWords = JSON.parse(fs.readFileSync(basePath + '\\words.json', 'utf8'));
const appMap = new Map();
for (const w of appWords) appMap.set(w.word.toLowerCase().trim(), w);
let appUpdated = 0;
for (const w of words) {
  const key = w.word.toLowerCase().trim();
  const appWord = appMap.get(key);
  if (appWord && (!appWord.meaning || appWord.meaning.length === 0) && w.definition) {
    appWord.meaning = w.definition; appUpdated++;
  }
}
fs.writeFileSync(basePath + '\\words.json', JSON.stringify(appWords, null, 2), 'utf8');

console.log(`Updated ${updated} in final_words.json, ${appUpdated} in words.json`);
const withDef = words.filter(w => w.definition && w.definition.length > 0).length;
console.log(`Final: ${withDef}/${words.length} have definitions (${(withDef/words.length*100).toFixed(1)}%)`);

// Final comprehensive stats
const withPhonetic = words.filter(w => w.phonetic && w.phonetic.length > 0).length;
const withPos = words.filter(w => w.pos && w.pos.length > 0).length;
const withExamples = words.filter(w => w.examples && w.examples.length > 0).length;
console.log(`Phonetic: ${withPhonetic}/${words.length} (${(withPhonetic/words.length*100).toFixed(1)}%)`);
console.log(`POS: ${withPos}/${words.length} (${(withPos/words.length*100).toFixed(1)}%)`);
console.log(`Examples: ${withExamples}/${words.length} (${(withExamples/words.length*100).toFixed(1)}%)`);
