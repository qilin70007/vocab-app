const fs = require('fs');
const path = 'E:/Tina/自研背单词软件/words.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// 3 bad POS entries to fix (abbr. -> n.)
const badFixes = {
  56: 'n.',
  1139: 'n.',
  1189: 'n.'
};

// 112 missing POS entries
const missingFixes = {
  121: 'n.', 134: 'n.', 151: 'n.', 152: 'n.', 173: 'v./n.',
  217: 'n.', 218: 'v./n.', 221: 'n.', 290: 'n.', 362: 'n.',
  376: 'n.', 393: 'v./n.', 421: 'n.', 430: 'v.', 470: 'n.',
  497: 'n.', 502: 'n.', 527: 'pron.', 528: 'adj.', 573: 'n.',
  574: 'n.', 575: 'adj./n.', 582: 'n.', 598: 'n.', 602: 'n.',
  603: 'v./adj.', 614: 'v./n.', 670: 'n.', 692: 'n.', 693: 'n.',
  698: 'n.', 702: 'v.', 717: 'n.', 726: 'v.', 746: 'v.',
  751: 'v./n.', 763: 'n./v.', 812: 'n.', 833: 'adj./n.', 852: 'n.',
  862: 'n.', 870: 'n.', 872: 'v.', 896: 'v.', 904: 'v./n.',
  905: 'n.', 910: 'v./n.', 930: 'adj.', 964: 'n.', 976: 'v.',
  981: 'n.', 986: 'n.', 998: 'n.', 1004: 'n./v.', 1009: 'adj./adv.',
  1011: 'adj./adv.', 1021: 'adj./adv.', 1031: 'n.', 1041: 'n.', 1103: 'n.',
  1106: 'v.', 1131: 'n.', 1138: 'v./n.', 1194: 'n.', 1257: 'v.',
  1277: 'v.', 1283: 'v.', 1326: 'v./n.', 1328: 'v./n.', 1347: 'v./n.',
  1366: 'v.', 1385: 'v.', 1390: 'v.', 1391: 'v.', 1400: 'v./n.',
  1403: 'v.', 1408: 'n.', 1409: 'n.', 1410: 'v.', 1418: 'v./n.',
  1420: 'v.', 1434: 'v.', 1439: 'v.', 1447: 'v./n.', 1452: 'v./n.',
  1467: 'pron.', 1480: 'v.', 1484: 'v.', 1487: 'v.', 1492: 'v.',
  1499: 'v.', 1502: 'v./n.', 1517: 'v./n.', 1540: 'n.', 1549: 'v.',
  1551: 'v.', 1565: 'v.', 1571: 'n./v.', 1572: 'n.', 1573: 'v.',
  1592: 'v.', 1599: 'v.', 1618: 'n.', 1659: 'v.', 1681: 'n.',
  1697: 'n.', 1698: 'v.', 1713: 'v.', 1724: 'adv./adj.', 1746: 'v.',
  1761: 'n.', 1775: 'v.'
};

let badFixed = [];
let missingFixed = [];
let notFound = [];

// Build lookup by number
const byNum = {};
for (const entry of data) {
  byNum[entry.number] = entry;
}

// Fix bad entries
for (const [num, pos] of Object.entries(badFixes)) {
  const n = parseInt(num);
  const entry = byNum[n];
  if (entry) {
    const oldPos = entry.pos;
    entry.pos = pos;
    badFixed.push({ num: n, word: entry.word, oldPos, newPos: pos });
  } else {
    notFound.push(n);
  }
}

// Fix missing entries
for (const [num, pos] of Object.entries(missingFixes)) {
  const n = parseInt(num);
  const entry = byNum[n];
  if (entry) {
    const oldPos = entry.pos;
    entry.pos = pos;
    missingFixed.push({ num: n, word: entry.word, oldPos, newPos: pos });
  } else {
    notFound.push(n);
  }
}

// Write back
fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');

console.log('=== BAD POS FIXES (' + badFixed.length + ') ===');
for (const f of badFixed) {
  console.log('  num ' + f.num + ' "' + f.word + '" pos: "' + f.oldPos + '" -> "' + f.newPos + '"');
}

console.log('\n=== MISSING POS FIXES (' + missingFixed.length + ') ===');
for (const f of missingFixed) {
  console.log('  num ' + f.num + ' "' + f.word + '" pos: "' + f.oldPos + '" -> "' + f.newPos + '"');
}

console.log('\n=== NOT FOUND ===');
if (notFound.length === 0) {
  console.log('  None');
} else {
  for (const n of notFound) console.log('  num ' + n);
}

console.log('\nTotal entries in file: ' + data.length);
console.log('Bad fixed: ' + badFixed.length);
console.log('Missing fixed: ' + missingFixed.length);
