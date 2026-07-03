const fs = require('fs');
let buf = fs.readFileSync('E:/Tina/自研背单词软件/mismatches_output.json');
let content;
try {
  content = buf.toString('utf-8');
  if (content.charCodeAt(0) === 0xFFFD) throw new Error('need gbk');
} catch (e) {
  // Try gbk
  const iconv = require('iconv-lite');
  if (iconv) {
    content = iconv.decode(buf, 'gbk');
  } else {
    // Use node's built-in decoder via TextDecoder
    const decoder = new TextDecoder('gbk');
    content = decoder.decode(buf);
  }
}
const m = JSON.parse(content);
console.log('Total entries:', m.length);
const adv = m.find(x => x && x.word === 'adventure');
if (adv) {
  console.log('adventure found:');
  console.log(JSON.stringify(adv, null, 2).substring(0, 3000));
} else {
  console.log('adventure not in mismatches list');
  console.log('First entry:', JSON.stringify(m[0], null, 2).substring(0, 500));
}
