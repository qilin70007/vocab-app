// Initialize user progress data
const fs = require('fs');
const path = require('path');

const wordsPath = path.join(__dirname, 'words.json');
const progressPath = path.join(__dirname, 'data', 'progress.json');

// Load words
const words = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

// Initialize progress for each word
const progress = {};
for (const w of words) {
  progress[w.word] = {
    status: 'new',  // 'new' | 'learning' | 'known'
    reviewCount: 0,
    lastReview: null,
    markTime: null
  };
}

// Save
fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf-8');
console.log(`Initialized progress for ${Object.keys(progress).length} words`);
