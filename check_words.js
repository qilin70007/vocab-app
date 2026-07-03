const fs = require('fs');
const words = JSON.parse(fs.readFileSync('E:\\Tina\\自研背单词软件\\extracted_words.json', 'utf8'));
console.log('Total words:', words.length);
console.log('First word:', words[0].word);
console.log('Last word:', words[words.length-1].word);
