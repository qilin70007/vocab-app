const fs = require('fs');
const w = require('./words.json');

const severeIssues = [];

for (let i = 0; i < w.length; i++) {
  const item = w[i];
  const wl = item.word.toLowerCase();
  const issues = [];

  if (item.examples) {
    for (const ex of item.examples) {
      const exLower = ex.toLowerCase();
      if (!exLower.includes(wl) && wl.length > 2) {
        let bestMatch = null;
        for (let j = Math.max(0, i - 5); j <= Math.min(w.length - 1, i + 5); j++) {
          if (j === i) continue;
          const nw = w[j].word.toLowerCase();
          if (nw.length > 2 && exLower.includes(nw)) {
            bestMatch = { word: w[j].word, number: w[j].number };
            break;
          }
        }
        issues.push({ type: 'example', content: ex.substring(0, 80), belongsTo: bestMatch });
      }
    }
  }

  if (item.collocations) {
    for (const col of item.collocations) {
      const colLower = col.toLowerCase();
      if (!colLower.includes(wl) && wl.length > 2) {
        let bestMatch = null;
        for (let j = Math.max(0, i - 5); j <= Math.min(w.length - 1, i + 5); j++) {
          if (j === i) continue;
          const nw = w[j].word.toLowerCase();
          if (nw.length > 2 && colLower.includes(nw)) {
            bestMatch = { word: w[j].word, number: w[j].number };
            break;
          }
        }
        const genericWords = ['the', 'from', 'how', 'all', 'cut', 'leave', 'get', 'come', 'please', 'out', 'cover', 'keep', 'soon', 'after', 'dead', 'there', 'two', 'some'];
        const firstWord = col.split(/[\s(]+/)[0].toLowerCase().replace(/[^a-z]/g, '');
        if (bestMatch && !genericWords.includes(firstWord)) {
          issues.push({ type: 'collocation', content: col.substring(0, 80), belongsTo: bestMatch });
        }
      }
    }
  }

  if (issues.length > 0) {
    severeIssues.push({ word: item.word, number: item.number, issues: issues });
  }
}

// Write result as JSON file
fs.writeFileSync('mismatch_report.json', JSON.stringify({
  totalEntries: w.length,
  entriesWithIssues: severeIssues.length,
  issues: severeIssues
}, null, 2), 'utf8');

console.log('Total entries:', w.length);
console.log('Entries with issues:', severeIssues.length);
console.log('Report written to mismatch_report.json');
