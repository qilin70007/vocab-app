// Parse vocabulary text into clean structured JSON data
const fs = require('fs');

const rawText = fs.readFileSync('E:\\Tina\\自研背单词软件\\raw_vocab_text.txt', 'utf-8');
const lines = rawText.split('\n');

const words = [];
let currentWord = null;
let currentSection = null;

// Word line regex: captures word, phonetic, and the rest (pos + meaning)
const wordLineRegex = /^([a-zA-Z][\w\-']*(?:\s[\w\-']+)?)\s+\[([^\]]*)\]\s*(.+)/;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Check for section letter (single uppercase A-Z)
  if (/^[A-Z]$/.test(line)) {
    currentSection = line;
    continue;
  }
  
  // Skip empty lines, page markers, section headers
  if (!line || /^--\s*\d+\s+of\s+\d+\s*--$/.test(line) || /^第[一二三四]部分/.test(line) || line === '第一部分 上海中考英语考纲词汇') {
    continue;
  }
  
  const match = line.match(wordLineRegex);
  if (match) {
    if (currentWord) words.push(currentWord);
    
    const word = match[1].trim();
    const phonetic = match[2].trim();
    const rest = match[3].trim();
    
    // Extract part of speech and meaning from rest
    // Patterns: "adj. 能够；有能力的" / "n. (U/C)车祸，事故" / "prep. 关于 adv. 大约"
    const posPattern = /^((?:n\.|v\.|vt\.|vi\.|adj\.|adv\.|prep\.|conj\.|pron\.|interj\.|num\.|art\.|link v\.|aux\.|mod\.)(?:\s*[,;/]\s*(?:n\.|v\.|vt\.|vi\.|adj\.|adv\.|prep\.|conj\.|pron\.|interj\.|num\.|art\.|link v\.|aux\.|mod\.))*)\s*(.+)/;
    const posMatch = rest.match(posPattern);
    
    let pos = '';
    let meaning = rest;
    if (posMatch) {
      pos = posMatch[1].trim();
      meaning = posMatch[2].trim();
    }
    
    // Clean meaning: remove leading numbers, punctuation artifacts
    meaning = meaning.replace(/^[，,、\s]*\d+[\.。、]\s*/, '').replace(/^[，,]\s*/, '').trim();
    
    currentWord = {
      word, phonetic, section: currentSection, pos, meaning,
      forms: [], collocations: [], examples: [], exampleCn: []
    };
  } else if (currentWord) {
    const d = line;
    if (/^\d+$/.test(d)) continue; // page numbers
    
    if (d.startsWith('变形：') || d.startsWith('变形:')) {
      const content = d.replace(/^变形[：:]\s*/, '');
      if (content) currentWord.forms.push(content);
      currentWord._lastCat = 'form';
    } else if (d.startsWith('搭配：') || d.startsWith('搭配:') || d.startsWith('搭配(')) {
      const content = d.replace(/^搭配[：:]\s*/, '');
      if (content) currentWord.collocations.push(content);
      currentWord._lastCat = 'colloc';
    } else if (/^\(\d+\)/.test(d) || /^\d+\)\s/.test(d)) {
      if (currentWord._lastCat === 'colloc') {
        currentWord.collocations.push(d);
      } else if (currentWord._lastCat === 'form') {
        currentWord.forms.push(d);
      }
    } else if (currentWord._lastCat === 'exampleCn') {
      // Chinese text after an English example
      if (/^[\u4e00-\u9fff]/.test(d)) {
        currentWord.exampleCn.push(d);
      } else {
        // Not Chinese, might be a new example
        currentWord.examples.push(d);
        currentWord._lastCat = 'example';
      }
    } else if (/^[A-Z"']/.test(d) && d.length > 15) {
      // Likely English example sentence
      currentWord.examples.push(d);
      currentWord._lastCat = 'example';
    } else if (/^[\u4e00-\u9fff]/.test(d) && currentWord._lastCat === 'example') {
      currentWord.exampleCn.push(d);
      currentWord._lastCat = 'exampleCn';
    } else if (currentWord._lastCat === 'form') {
      currentWord.forms.push(d);
    } else if (currentWord._lastCat === 'colloc') {
      currentWord.collocations.push(d);
    } else {
      // Default: treat as form/variation
      currentWord.forms.push(d);
      currentWord._lastCat = 'form';
    }
  }
}

if (currentWord) words.push(currentWord);

// Clean up internal fields
for (const w of words) {
  delete w._lastCat;
}

// Stats
const sections = {};
for (const w of words) {
  sections[w.section] = (sections[w.section] || 0) + 1;
}
console.log('Total words:', words.length);
console.log('Sections:', JSON.stringify(sections));

// Sample
for (let i = 0; i < Math.min(3, words.length); i++) {
  console.log(`\n--- ${words[i].word} ---`);
  console.log(JSON.stringify(words[i], null, 2));
}

fs.writeFileSync('E:\\Tina\\自研背单词软件\\words.json', JSON.stringify(words, null, 2), 'utf-8');
console.log('\nSaved to words.json');
