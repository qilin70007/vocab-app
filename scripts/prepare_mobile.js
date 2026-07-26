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

const mobileHtml = fs.readFileSync(mobileIndex, 'utf8');
if (!mobileHtml.includes('window.VOCAB_STANDALONE = true')) {
  console.error('Generated Android entry does not enable standalone mode');
  process.exit(1);
}

const words = JSON.parse(fs.readFileSync(mobileWords, 'utf8'));
console.log(`Prepared Android offline bundle: ${words.length} words -> mobile-dist/`);
