const fs = require('fs');
const path = require('path');
const words = ['anything', 'directly', 'collocation', 'including', 'infer', 'republic', 'satisfying', 'yogurt'];
const ocrDir = 'E:\\Tina\\自研背单词软件\\ocr_output';
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt'));
for (const w of words) {
  let found = false;
  for (const f of files) {
    const t = fs.readFileSync(path.join(ocrDir, f), 'utf8').toLowerCase();
    if (t.includes(w)) {
      found = true;
      console.log(w + ' found in ' + f);
      // Show context
      const idx = t.indexOf(w);
      const start = Math.max(0, idx - 80);
      const end = Math.min(t.length, idx + 120);
      console.log('  context: ...' + t.substring(start, end) + '...');
      break;
    }
  }
  if (!found) console.log(w + ' NOT in any OCR file');
}
