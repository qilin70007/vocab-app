const fs = require('fs');
const w = require('./words_fixed.json');

// Phase 2: More thorough cleanup
// 1. Remove genericWords filter - check ALL collocations more aggressively
// 2. Handle "after all", "soon after" etc that were missed

const wordMap = {};
for (const item of w) {
  wordMap[item.word.toLowerCase()] = item;
}

// For each entry, check if collocations/examples belong to a neighbor
// This time, also check non-adjacent neighbors and remove generic filter
const toRemove = {};
const toAdd = {};

for (let i = 0; i < w.length; i++) {
  const item = w[i];
  const wl = item.word.toLowerCase();
  const removeList = [];

  // Check collocations - this time don't filter generic words
  if (item.collocations) {
    for (let ci = 0; ci < item.collocations.length; ci++) {
      const col = item.collocations[ci];
      const colLower = col.toLowerCase();
      
      // Skip if contains the entry word
      if (colLower.includes(wl) && wl.length > 2) continue;
      if (wl.length <= 2) continue;
      
      // Try to find which word this collocation belongs to
      // Check wider range: i-8 to i+8
      let bestMatch = null;
      let bestMatchLen = 0;
      for (let j = Math.max(0, i - 8); j <= Math.min(w.length - 1, i + 8); j++) {
        if (j === i) continue;
        const nw = w[j].word.toLowerCase();
        if (nw.length > 2 && colLower.includes(nw) && nw.length > bestMatchLen) {
          bestMatch = w[j];
          bestMatchLen = nw.length;
        }
      }
      
      // Also check if collocation text starts with a known word
      const firstWord = col.split(/[\s(]+/)[0].toLowerCase().replace(/[^a-z]/g, '');
      if (!bestMatch && firstWord && firstWord !== wl && firstWord.length > 2) {
        if (wordMap[firstWord]) {
          bestMatch = wordMap[firstWord];
        }
      }
      
      if (bestMatch) {
        const targetKey = bestMatch.word.toLowerCase();
        if (!toAdd[targetKey]) toAdd[targetKey] = { collocations: [], examples: [] };
        if (!bestMatch.collocations.includes(col)) {
          toAdd[targetKey].collocations.push(col);
        }
        removeList.push({ type: 'collocation', index: ci, content: col });
      }
    }
  }

  // Check examples more aggressively
  if (item.examples) {
    for (let ei = 0; ei < item.examples.length; ei++) {
      const ex = item.examples[ei];
      const exLower = ex.toLowerCase();
      if (exLower.includes(wl) && wl.length > 2) continue;
      if (wl.length <= 2) continue;
      
      // Check if this example contains a different dictionary word
      let bestMatch = null;
      let bestMatchLen = 0;
      for (let j = Math.max(0, i - 8); j <= Math.min(w.length - 1, i + 8); j++) {
        if (j === i) continue;
        const nw = w[j].word.toLowerCase();
        if (nw.length > 3 && exLower.includes(nw) && nw.length > bestMatchLen) {
          bestMatch = w[j];
          bestMatchLen = nw.length;
        }
      }
      
      if (bestMatch) {
        const targetKey = bestMatch.word.toLowerCase();
        if (!toAdd[targetKey]) toAdd[targetKey] = { collocations: [], examples: [] };
        if (!bestMatch.examples.includes(ex)) {
          toAdd[targetKey].examples.push(ex);
        }
        removeList.push({ type: 'example', index: ei, content: ex });
      }
    }
  }

  if (removeList.length > 0) {
    toRemove[item.number] = removeList;
  }
}

// Apply changes
let removedCount = 0;
let addedCount = 0;

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

// Write final fixed file
fs.writeFileSync('words_fixed_v2.json', JSON.stringify(w, null, 2), 'utf8');

console.log('=== FIX V2 SUMMARY ===');
console.log('Items removed from wrong entries:', removedCount);
console.log('Items added to correct entries:', addedCount);
console.log('Fixed file written to words_fixed_v2.json');

// Verify key entries
const actually = w.find(x => x.word.toLowerCase() === 'actually');
console.log('\n=== actually (after fix) ===');
console.log('collocations:', actually.collocations);
console.log('examples:', actually.examples);

const advice = w.find(x => x.word.toLowerCase() === 'advice');
console.log('\n=== advice (after fix) ===');
console.log('collocations:', advice.collocations);
console.log('examples:', advice.examples);

const act = w.find(x => x.word.toLowerCase() === 'act');
console.log('\n=== act (after fix) ===');
console.log('collocations:', act.collocations);
console.log('examples:', act.examples);
