const w = require('./words.json');
const targets = ['actually', 'advice', 'anything', 'directly', 'including', 'republic', 'satisfying', 'yogurt', 'infer', 'collocation'];
for (const t of targets) {
  const item = w.find(x => x.word.toLowerCase() === t);
  if (item) {
    console.log('=== ' + t + ' ===');
    console.log('  collocations: ' + JSON.stringify(item.collocations));
    console.log('  examples: ' + JSON.stringify(item.examples));
    console.log('');
  }
}
console.log('=== TOTAL STATS ===');
console.log('Total entries: ' + w.length);
console.log('With examples: ' + w.filter(x => x.examples && x.examples.length > 0).length);
console.log('Without examples: ' + w.filter(x => !x.examples || x.examples.length === 0).length);
