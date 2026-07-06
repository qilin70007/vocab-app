#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = path.join(root, 'words.json');
const target = path.join(root, 'public', 'words.json');

if (!fs.existsSync(source)) {
  console.error('Missing words.json');
  process.exit(1);
}
fs.copyFileSync(source, target);
const words = JSON.parse(fs.readFileSync(target, 'utf8'));
console.log(`Prepared Android offline word asset: ${words.length} words -> public/words.json`);
