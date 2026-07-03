const fs = require('fs');
const path = 'E:\\Tina\\自研背单词软件\\words.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

console.log('=== China (284 vs 285) ===');
const china1 = data[283]; // index 283 = number 284
const china2 = data[284]; // index 284 = number 285
console.log('China #284:', JSON.stringify(china1, null, 2));
console.log('\nChina #285:', JSON.stringify(china2, null, 2));
console.log('\nAre they identical?', JSON.stringify(china1) === JSON.stringify(china2));

console.log('\n\n=== May (966 vs 967) ===');
const may1 = data[965]; // index 965 = number 966
const may2 = data[966]; // index 966 = number 967
console.log('May #966:', JSON.stringify(may1, null, 2));
console.log('\nMay #967:', JSON.stringify(may2, null, 2));
console.log('\nAre they identical?', JSON.stringify(may1) === JSON.stringify(may2));

console.log('\n\n=== miss (994 vs 995) ===');
const miss1 = data[993]; // index 993 = number 994
const miss2 = data[994]; // index 994 = number 995
console.log('miss #994:', JSON.stringify(miss1, null, 2));
console.log('\nmiss #995:', JSON.stringify(miss2, null, 2));
console.log('\nAre they identical?', JSON.stringify(miss1) === JSON.stringify(miss2));
