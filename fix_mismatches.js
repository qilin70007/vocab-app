const fs = require('fs');
const w = require('./words.json');

// Build a map for quick word lookup
const wordMap = {};
for (const item of w) {
  wordMap[item.word.toLowerCase()] = item;
}

// Track what needs to be moved
// For each entry, collect items to remove and items to add
const toRemove = {}; // number -> array of {type, content}
const toAdd = {};    // word(lowercase) -> {collocations: [], examples: []}

for (let i = 0; i < w.length; i++) {
  const item = w[i];
  const wl = item.word.toLowerCase();
  const removeList = [];

  // Check examples
  if (item.examples) {
    for (let ei = 0; ei < item.examples.length; ei++) {
      const ex = item.examples[ei];
      const exLower = ex.toLowerCase();
      if (!exLower.includes(wl) && wl.length > 2) {
        // Find which neighbor this belongs to
        let bestMatch = null;
        for (let j = Math.max(0, i - 5); j <= Math.min(w.length - 1, i + 5); j++) {
          if (j === i) continue;
          const nw = w[j].word.toLowerCase();
          if (nw.length > 2 && exLower.includes(nw)) {
            bestMatch = w[j];
            break;
          }
        }
        if (bestMatch) {
          const targetKey = bestMatch.word.toLowerCase();
          if (!toAdd[targetKey]) toAdd[targetKey] = { collocations: [], examples: [] };
          // Check if this example is already in the target
          if (!bestMatch.examples.includes(ex)) {
            toAdd[targetKey].examples.push(ex);
          }
          removeList.push({ type: 'example', index: ei, content: ex });
        }
      }
    }
  }

  // Check collocations
  if (item.collocations) {
    for (let ci = 0; ci < item.collocations.length; ci++) {
      const col = item.collocations[ci];
      const colLower = col.toLowerCase();
      if (!colLower.includes(wl) && wl.length > 2) {
        let bestMatch = null;
        for (let j = Math.max(0, i - 5); j <= Math.min(w.length - 1, i + 5); j++) {
          if (j === i) continue;
          const nw = w[j].word.toLowerCase();
          if (nw.length > 2 && colLower.includes(nw)) {
            bestMatch = w[j];
            break;
          }
        }
        const genericWords = ['the', 'from', 'how', 'all', 'cut', 'leave', 'get', 'come', 'please', 'out', 'cover', 'keep', 'soon', 'after', 'dead', 'there', 'two', 'some'];
        const firstWord = col.split(/[\s(]+/)[0].toLowerCase().replace(/[^a-z]/g, '');
        if (bestMatch && !genericWords.includes(firstWord)) {
          const targetKey = bestMatch.word.toLowerCase();
          if (!toAdd[targetKey]) toAdd[targetKey] = { collocations: [], examples: [] };
          if (!bestMatch.collocations.includes(col)) {
            toAdd[targetKey].collocations.push(col);
          }
          removeList.push({ type: 'collocation', index: ci, content: col });
        }
      }
    }
  }

  if (removeList.length > 0) {
    toRemove[item.number] = removeList;
  }
}

// Now apply changes
let removedCount = 0;
let addedCount = 0;

// Remove mismatched items (iterate examples/collocations in reverse index order)
for (const item of w) {
  if (toRemove[item.number]) {
    const removes = toRemove[item.number].sort((a, b) => b.index - a.index);
    for (const r of removes) {
      if (r.type === 'example' && item.examples) {
        item.examples.splice(r.index, 1);
        removedCount++;
      } else if (r.type === 'collocation' && item.collocations) {
        item.collocations.splice(r.index, 1);
        removedCount++;
      }
    }
  }
}

// Add items to correct entries
for (const [wordKey, additions] of Object.entries(toAdd)) {
  const target = wordMap[wordKey];
  if (target) {
    for (const col of additions.collocations) {
      if (!target.collocations.includes(col)) {
        target.collocations.push(col);
        addedCount++;
      }
    }
    for (const ex of additions.examples) {
      if (!target.examples.includes(ex)) {
        target.examples.push(ex);
        addedCount++;
      }
    }
  }
}

// Write fixed file
fs.writeFileSync('words_fixed.json', JSON.stringify(w, null, 2), 'utf8');

console.log('=== FIX SUMMARY ===');
console.log('Items removed from wrong entries:', removedCount);
console.log('Items added to correct entries:', addedCount);
console.log('Fixed file written to words_fixed.json');

// Also re-run the mismatch check to see how many remain
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
            bestMatch = w[j];
            break;
          }
        }
        if (bestMatch) {
          issues.push({ type: 'example', content: ex.substring(0, 60), belongsTo: bestMatch.word });
        }
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
            bestMatch = w[j];
            break;
          }
        }
        const genericWords = ['the', 'from', 'how', 'all', 'cut', 'leave', 'get', 'come', 'please', 'out', 'cover', 'keep', 'soon', 'after', 'dead', 'there', 'two', 'some'];
        const firstWord = col.split(/[\s(]+/)[0].toLowerCase().replace(/[^a-z]/g, '');
        if (bestMatch && !genericWords.includes(firstWord)) {
          issues.push({ type: 'collocation', content: col.substring(0, 60), belongsTo: bestMatch.word });
        }
      }
    }
  }
  if (issues.length > 0) {
    severeIssues.push({ word: item.word, number: item.number, issues: issues });
  }
}

console.log('Remaining issues after fix:', severeIssues.length);
if (severeIssues.length > 0) {
  console.log(JSON.stringify(severeIssues.slice(0, 10), null, 2));
}
