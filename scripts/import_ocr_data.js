'use strict';

const fs = require('fs');
const path = require('path');

const input = process.argv[2];
const output = process.argv[3] || path.resolve(process.cwd(), 'words.imported.json');

if (!input) {
  console.error('用法：node scripts/import_ocr_data.js <entries.json> [输出文件]');
  process.exit(1);
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function unique(values, limit = 8) {
  return [...new Set(values.map(clean).filter(Boolean))].slice(0, limit);
}

function splitChineseEnglish(line) {
  const match = line.match(/[\u3400-\u9fff]/);
  if (!match) return null;
  const english = line.slice(0, match.index).trim();
  const chinese = line.slice(match.index).trim();
  return english && chinese ? { english, chinese } : null;
}

function extractDetails(entry) {
  const lines = String(entry.raw_block || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[>\s]+/, '').trim())
    .filter(Boolean);
  const forms = [];
  const collocations = [];
  const examples = [];
  let mode = '';

  for (const line of lines.slice(1)) {
    if (/词形拓展|词形变化/.test(line)) { mode = 'forms'; continue; }
    if (/常用词组|固定搭配/.test(line)) { mode = 'collocations'; continue; }
    if (/名师点拨|近义|反义|谚语/.test(line)) { mode = ''; continue; }
    if (line.length > 260) continue;
    const pair = splitChineseEnglish(line);
    if (!pair) continue;
    const combined = `${pair.english} ${pair.chinese}`;
    if (mode === 'forms') { forms.push(combined); continue; }
    if (mode === 'collocations') { collocations.push(combined); continue; }
    if (/[.!?]$/.test(pair.english) && pair.english.split(/\s+/).length >= 4) {
      examples.push(combined);
      continue;
    }
    if (/\b(to|of|for|with|in|on|at|from|do|doing|sth|sb)\b/i.test(pair.english)) collocations.push(combined);
  }
  return { forms: unique(forms), collocations: unique(collocations), examples: unique(examples, 5) };
}

const raw = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
if (!Array.isArray(raw)) throw new Error('entries.json 顶层必须为数组');

const byWord = new Map();
let rejected = 0;
for (const entry of raw) {
  const word = clean(entry.headword).toLowerCase();
  const meaning = clean(entry.meaning_zh_ocr);
  if (!/^[a-z][a-z' -]{0,50}$/i.test(word) || !meaning) { rejected += 1; continue; }
  const details = extractDetails(entry);
  const record = {
    id: Number(entry.sequence_no || entry.printed_no || byWord.size + 1),
    word,
    section: word[0].toUpperCase(),
    phonetic: clean(entry.phonetic_ocr),
    pos: clean(entry.part_of_speech_ocr),
    meaning,
    forms: details.forms,
    collocations: details.collocations,
    examples: details.examples,
    source: '2026年上海市初中英语考纲词汇用法手册',
    sourcePage: entry.source_book_page || null,
    frequency: Number(entry.frequency_marks || 0),
    reviewStatus: clean(entry.review_status || 'unreviewed')
  };
  const existing = byWord.get(word);
  if (!existing) byWord.set(word, record);
  else {
    if (record.meaning.length > existing.meaning.length) existing.meaning = record.meaning;
    existing.forms = unique([...existing.forms, ...record.forms]);
    existing.collocations = unique([...existing.collocations, ...record.collocations]);
    existing.examples = unique([...existing.examples, ...record.examples], 5);
    existing.frequency = Math.max(existing.frequency, record.frequency);
  }
}

const words = [...byWord.values()]
  .sort((a, b) => a.word.localeCompare(b.word))
  .map((record, index) => ({ ...record, id: index + 1 }));
fs.writeFileSync(output, JSON.stringify(words, null, 2), 'utf8');
const report = {
  inputEntries: raw.length,
  outputWords: words.length,
  rejected,
  unreviewed: words.filter((word) => word.reviewStatus !== 'reviewed').length,
  output
};
fs.writeFileSync(`${output}.report.json`, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
