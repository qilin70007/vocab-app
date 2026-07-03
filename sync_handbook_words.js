const fs = require('fs');
const path = require('path');

const SOURCE_PATH = path.join(__dirname, 'data', 'words_800.json');
const OUTPUT_PATH = path.join(__dirname, 'words.json');

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeWord(rawWord) {
  return normalizeWhitespace(rawWord).toLowerCase();
}

function sectionFor(word) {
  const first = (word || '#')[0].toUpperCase();
  return /^[A-Z]$/.test(first) ? first : '#';
}

function buildWords() {
  const source = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
  const seen = new Set();
  const words = [];

  for (const entry of source) {
    const word = normalizeWord(entry.word);
    if (!word || seen.has(word)) continue;
    seen.add(word);

    const meaning = normalizeWhitespace(entry.meaning);
    const usage = normalizeWhitespace(entry.usage);
    const variant = normalizeWhitespace(entry.variant);
    const forms = variant ? `变体：${variant}` : '';

    words.push({
      id: words.length + 1,
      word,
      section: sectionFor(word),
      phonetic: '',
      pos: normalizeWhitespace(entry.pos),
      meaning,
      forms,
      collocations: usage,
      example: '',
      source: entry.source || '26年初中英语考纲词汇用法手册'
    });
  }

  words.sort((a, b) => a.word.localeCompare(b.word));
  words.forEach((word, index) => {
    word.id = index + 1;
    word.section = sectionFor(word.word);
  });

  return words;
}

const words = buildWords();
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(words, null, 2)}\n`, 'utf8');
console.log(`Synced ${words.length} words to ${path.relative(__dirname, OUTPUT_PATH)} from ${path.relative(__dirname, SOURCE_PATH)}`);
