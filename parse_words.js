// Parse vocabulary text into structured JSON data
const fs = require('fs');

const rawText = fs.readFileSync('E:\\Tina\\自研背单词软件\\raw_vocab_text.txt', 'utf-8');

// Split by page markers and clean
const lines = rawText.split('\n');

const words = [];
let currentWord = null;
let currentSection = null;

// Regex to match a word entry: word [phonetic] part_of_speech meaning
// Examples:
//   able ['eibl] adj. 能够；有能力的
//   about ['əbaʊt]prep. 关于 adv. 大约
//   accident ['æksidənt] n. (U/C)车祸，事故
const wordLineRegex = /^([a-zA-Z][\w\-']*(?:\s[\w\-']+)?)\s+\[([^\]]*)\]\s*(.+)/;
// Some entries may not have phonetic, like: act [ækt] v. 扮演
// Also handle cases like: addition [əˈdiʃən] n. (U / C))加；增力的人 / 物

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Skip empty lines, page markers, section headers
  if (!line || /^--\s*\d+\s+of\s+\d+\s*--$/.test(line) || /^第[一二三四]部分/.test(line) || /^[A-Z]$/.test(line) || line === '第一部分 上海中考英语考纲词汇') {
    // Single uppercase letter = new section (A, B, C...)
    if (/^[A-Z]$/.test(line)) {
      currentSection = line;
    }
    continue;
  }
  
  // Try to match a word entry line
  const match = line.match(wordLineRegex);
  if (match) {
    // Save previous word
    if (currentWord) {
      words.push(currentWord);
    }
    
    const word = match[1].trim();
    const phonetic = match[2].trim();
    const rest = match[3].trim();
    
    currentWord = {
      word: word,
      phonetic: phonetic,
      section: currentSection,
      pos: rest,  // part of speech + meaning (combined for now)
      details: []  // will collect 变形/搭配/examples
    };
  } else if (currentWord) {
    // This is a detail line for the current word (变形/搭配/examples)
    // Skip lines that are clearly page numbers or separators
    if (/^\d+$/.test(line)) continue;
    currentWord.details.push(line);
  }
}

// Don't forget the last word
if (currentWord) {
  words.push(currentWord);
}

console.log(`Total words parsed: ${words.length}`);

// Show some samples
for (let i = 0; i < Math.min(5, words.length); i++) {
  console.log(`\n--- Word ${i+1} ---`);
  console.log(JSON.stringify(words[i], null, 2));
}

// Show last 3
for (let i = Math.max(0, words.length - 3); i < words.length; i++) {
  console.log(`\n--- Word ${i+1} ---`);
  console.log(JSON.stringify(words[i], null, 2));
}

// Save parsed data
fs.writeFileSync('E:\\Tina\\自研背单词软件\\words_raw.json', JSON.stringify(words, null, 2), 'utf-8');
console.log('\nSaved to words_raw.json');
