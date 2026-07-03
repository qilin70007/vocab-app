const fs = require('fs');
const batchPath = 'E:\\Tina\\自研背单词软件\\batch.json';
const extractedPath = 'E:\\Tina\\自研背单词软件\\extracted_words.json';

const batch = JSON.parse(fs.readFileSync(batchPath, 'utf-8'));
const existing = JSON.parse(fs.readFileSync(extractedPath, 'utf-8'));

const merged = existing.concat(batch);
fs.writeFileSync(extractedPath, JSON.stringify(merged, null, 2), 'utf-8');
console.log('Appended', batch.length, 'words. Total:', merged.length);
console.log('Last word:', merged[merged.length-1].word);
