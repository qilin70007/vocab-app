const fs = require('fs');
const path = require('path');

const OCR_DIR = 'E:/Tina/自研背单词软件/ocr_output';
const content = fs.readFileSync(path.join(OCR_DIR, 'page_0013.txt'), 'utf8');
const lines = content.split('\n').map(l => l.trim());

function stripOcrPrefix(line) {
  let text = line;
  for (let i = 0; i < 5; i++) {
    const before = text;
    text = text.replace(/^[=\w]+\s+/, '');
    text = text.replace(/^>\s*/, '');
    text = text.replace(/^[=]+\s*/, '');
    if (text === before) break;
  }
  return text.trim();
}

const POS_PATTERN = '(?:adj\\.?|adv\\.?|n\\.?|v\\.?|vt\\.?|vi\\.?|conj\\.?|prep\\.?|pron\\.?|art\\.?|num\\.?|int\\.?|aux\\.?|linking\\s*v\\.?|modal\\s*v\\.?)';
const POS_FULL = `${POS_PATTERN}(?:\\s*&\\s*${POS_PATTERN})*`;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('after') && line.includes('/')) {
    const stripped = stripOcrPrefix(line);
    const isMain = /^\d+[.,]?\s*\*{0,3}\s*['a-zA-Z]/.test(stripped);
    console.log(`Line ${i}: ${isMain ? 'MAIN' : 'NOT MAIN'} | ${JSON.stringify(line)}`);
    console.log(`  stripped: ${JSON.stringify(stripped)}`);
    
    if (isMain) {
      const numMatch = stripped.match(/^(\d+)[.,]?\s*/);
      if (numMatch) {
        let rest = stripped.substring(numMatch[0].length);
        const starMatch = rest.match(/^(\*{0,3})\s*'*\s*/);
        if (starMatch) rest = rest.substring(starMatch[0].length);
        
        const phonMatch = rest.match(/^(\S+)\s+\/([^\/]+)\/\s*/);
        if (phonMatch) {
          let word = phonMatch[1];
          console.log(`  word before clean: ${JSON.stringify(word)}`);
          word = word.replace(/^[^a-zA-Z]+/, '').replace(/[^a-zA-Z\-'\s]/g, '').trim();
          console.log(`  word after clean: ${JSON.stringify(word)}`);
          console.log(`  phonetic: ${JSON.stringify(phonMatch[2])}`);
        } else {
          console.log('  no phonetic match');
          console.log(`  rest: ${JSON.stringify(rest)}`);
        }
      }
    }
  }
}
