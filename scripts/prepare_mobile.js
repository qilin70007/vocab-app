#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = path.join(root, 'words.json');
const publicDir = path.join(root, 'public');
const publicWords = path.join(publicDir, 'words.json');
const mobileEntry = path.join(publicDir, 'mobile.html');
const mobileDir = path.join(root, 'mobile-dist');
const mobileIndex = path.join(mobileDir, 'index.html');
const mobileWords = path.join(mobileDir, 'words.json');
const mobileWordsScript = path.join(mobileDir, 'words-data.js');

if (!fs.existsSync(source)) {
  console.error('Missing words.json');
  process.exit(1);
}
if (!fs.existsSync(mobileEntry)) {
  console.error('Missing public/mobile.html');
  process.exit(1);
}

fs.copyFileSync(source, publicWords);
fs.rmSync(mobileDir, { recursive: true, force: true });
fs.cpSync(publicDir, mobileDir, { recursive: true });
fs.copyFileSync(mobileEntry, mobileIndex);
fs.copyFileSync(source, mobileWords);

const words = JSON.parse(fs.readFileSync(mobileWords, 'utf8'));
const departure = words.find((word) => String(word.word || '').toLowerCase() === 'departure');
if (departure?.forms?.some((form) => /\bdeparty\b/i.test(String(form)))) {
  console.error('Invalid words.json: departure still contains the misspelling "departy"');
  process.exit(1);
}
const serializedWords = JSON.stringify(words)
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');
fs.writeFileSync(
  mobileWordsScript,
  `'use strict';\nglobalThis.VOCAB_BUILTIN_WORDS = ${serializedWords};\n`,
  'utf8'
);

let mobileHtml = fs.readFileSync(mobileIndex, 'utf8');
if (!mobileHtml.includes('/words-data.js')) {
  mobileHtml = mobileHtml.replace(
    '<script src="/docx-export.js',
    '<script src="/words-data.js?v=2.5.9"></script>\n  <script src="/docx-export.js'
  );
  fs.writeFileSync(mobileIndex, mobileHtml, 'utf8');
}

if (!mobileHtml.includes('window.VOCAB_STANDALONE = true')
  || !mobileHtml.includes('name="vocab-mode" content="standalone"')
  || !mobileHtml.includes('/words-data.js')) {
  console.error('Generated Android entry does not enable standalone mode');
  process.exit(1);
}

console.log(`Prepared Android offline bundle: ${words.length} embedded words -> mobile-dist/`);
