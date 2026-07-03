// Refine word parsing - better structure with separated fields
const fs = require('fs');

const rawWords = JSON.parse(fs.readFileSync('E:\\Tina\\自研背单词软件\\words_raw.json', 'utf-8'));

const refinedWords = [];

for (const w of rawWords) {
  const entry = {
    word: w.word,
    phonetic: w.phonetic,
    section: w.section,
    pos: '',        // part of speech
    meaning: '',    // Chinese meaning
    forms: [],      // 变形/词性转换
    collocations: [], // 搭配
    examples: [],   // 例句
    exampleCn: []   // 中文翻译
  };

  // Parse pos field - extract part of speech and meaning
  // Pattern: "adj. 能够；有能力的" or "v. 接受；认可" or "n. (U/C)车祸，事故"
  const posMatch = w.pos.match(/^((?:n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|interj\.|num\.|art\.|vt\.|vi\.|link v\.|aux\.|mod\.)(?:\s*[,/]\s*(?:n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|interj\.|num\.|art\.|vt\.|vi\.|link v\.|aux\.|mod\.))*)\s*(.+)/);
  if (posMatch) {
    entry.pos = posMatch[1].trim();
    entry.meaning = posMatch[2].trim();
  } else {
    entry.meaning = w.pos;
  }

  // Parse details
  let lastCategory = '';
  for (const detail of w.details) {
    const d = detail.trim();
    if (!d) continue;

    if (d.startsWith('变形') || d.startsWith('变形：') || d.startsWith('变形:')) {
      lastCategory = 'form';
      const content = d.replace(/^变形[：:]?\s*/, '');
      if (content) entry.forms.push(content);
    } else if (d.startsWith('搭配') || d.startsWith('搭配：') || d.startsWith('搭配:')) {
      lastCategory = 'collocation';
      const content = d.replace(/^搭配[：:]?\s*/, '');
      if (content) entry.collocations.push(content);
    } else if (/^\(\d+\)/.test(d)) {
      // Sub-item like (1), (2), (3)
      if (lastCategory === 'collocation') {
        entry.collocations.push(d);
      } else if (lastCategory === 'form') {
        entry.forms.push(d);
      }
    } else if (/^[A-Z]/.test(d) && d.length > 20 && !d.startsWith('变形') && !d.startsWith('搭配')) {
      // Likely an English example sentence
      entry.examples.push(d);
      lastCategory = 'example';
    } else if (/^[\u4e00-\u9fff]/.test(d) && lastCategory === 'example') {
      // Chinese translation following example
      entry.exampleCn.push(d);
    } else {
      // Could be a form entry on the same line as 变形
      if (lastCategory === 'form') {
        entry.forms.push(d);
      } else if (lastCategory === 'collocation') {
        entry.collocations.push(d);
      } else {
        // Treat as general detail
        entry.forms.push(d);
      }
    }
  }

  refinedWords.push(entry);
}

// Show stats
const sections = {};
for (const w of refinedWords) {
  sections[w.section] = (sections[w.section] || 0) + 1;
}
console.log('Total words:', refinedWords.length);
console.log('Sections:', JSON.stringify(sections));

// Show a few refined examples
for (let i = 0; i < Math.min(3, refinedWords.length); i++) {
  console.log('\n---', refinedWords[i].word, '---');
  console.log(JSON.stringify(refinedWords[i], null, 2));
}

// Save
fs.writeFileSync('E:\\Tina\\自研背单词软件\\words.json', JSON.stringify(refinedWords, null, 2), 'utf-8');
console.log('\nSaved to words.json');
