const fs = require('fs');

const wordsPath = 'E:\\Tina\\\u81EA\u7814\u80CC\u5355\u8BCD\u8F6F\u4EF6\\data\\words_800.json';
console.log('Path exists check...');
try {
  const data = fs.readFileSync(wordsPath, 'utf8');
  const words = JSON.parse(data);
  console.log('Loaded! Words count:', words.length);
  if (words[0]) console.log('First word:', JSON.stringify(words[0]).substring(0, 100));
} catch(e) {
  console.log('Error:', e.message);
}
