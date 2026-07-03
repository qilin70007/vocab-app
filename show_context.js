const fs = require('fs');
const path = require('path');

const ocrDir = 'E:\\Tina\\自研背单词软件\\ocr_output';

// Words to check - show full context
const words = ['anything', 'directly', 'including', 'infer', 'republic', 'satisfying', 'yogurt', 'collocation'];

for (const w of words) {
  console.log('\n========== ' + w + ' ==========');
  const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt'));
  for (const f of files) {
    const text = fs.readFileSync(path.join(ocrDir, f), 'utf8');
    const lower = text.toLowerCase();
    const idx = lower.indexOf(w);
    if (idx >= 0) {
      // Show 300 chars before and after
      const start = Math.max(0, idx - 150);
      const end = Math.min(text.length, idx + 200);
      console.log('File: ' + f);
      console.log(text.substring(start, end));
      console.log('---');
      break; // Only first occurrence
    }
  }
}
