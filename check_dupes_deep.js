const fs = require('fs');
const path = 'E:\\Tina\\自研背单词软件\\words.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

function deepCompare(a, b, path='') {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    console.log('Different key counts at', path, '- A:', aKeys.length, 'B:', bKeys.length);
    return;
  }
  for (const key of aKeys) {
    if (!(key in b)) {
      console.log('Key', path+'.'+key, 'missing in B');
      continue;
    }
    const va = JSON.stringify(a[key]);
    const vb = JSON.stringify(b[key]);
    if (va !== vb) {
      console.log('Difference at', path+'.'+key);
      console.log('  A:', va);
      console.log('  B:', vb);
    }
  }
}

console.log('=== China 284 vs 285 deep diff ===');
deepCompare(data[283], data[284], 'china');

console.log('\n=== May 966 vs 967 deep diff ===');
deepCompare(data[965], data[966], 'may');

console.log('\n=== miss 994 vs 995 deep diff ===');
deepCompare(data[993], data[994], 'miss');

// Check for any actual meaningful difference
function hasMeaningfulDifference(a, b) {
  const ignoreKeys = ['number'];
  const aFiltered = {};
  const bFiltered = {};
  for (const k of Object.keys(a)) {
    if (!ignoreKeys.includes(k)) aFiltered[k] = a[k];
  }
  for (const k of Object.keys(b)) {
    if (!ignoreKeys.includes(k)) bFiltered[k] = b[k];
  }
  return JSON.stringify(aFiltered) !== JSON.stringify(bFiltered);
}

console.log('\n=== Meaningful differences ===');
console.log('China (excluding number):', hasMeaningfulDifference(data[283], data[284]));
console.log('May (excluding number):', hasMeaningfulDifference(data[965], data[966]));
console.log('miss (excluding number):', hasMeaningfulDifference(data[993], data[994]));
