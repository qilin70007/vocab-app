const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TESSERACT = 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
const PAGES_DIR = 'E:\\Tina\\自研背单词软件\\pdf_pages';
const OUTPUT_DIR = 'E:\\Tina\\自研背单词软件\\ocr_output';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Missing pages: 1-27 and 259-382
const ranges = [[1, 27], [259, 382]];
let done = 0, skipped = 0, failed = 0;

for (const [startPage, endPage] of ranges) {
  for (let i = startPage; i <= endPage; i++) {
    const pageNum = String(i).padStart(4, '0');
    const inputFile = path.join(PAGES_DIR, `page_${pageNum}.png`);
    const outputFile = path.join(OUTPUT_DIR, `page_${pageNum}`);
    
    if (!fs.existsSync(inputFile)) {
      console.log(`Page ${pageNum} - file not found, skip`);
      skipped++;
      continue;
    }
    
    if (fs.existsSync(outputFile + '.txt')) {
      console.log(`Page ${pageNum} - already done, skip`);
      skipped++;
      continue;
    }
    
    try {
      execSync(`"${TESSERACT}" "${inputFile}" "${outputFile}" -l eng --psm 6`, {
        timeout: 120000,
        stdio: 'pipe'
      });
      done++;
      if (done % 10 === 0) console.log(`Progress: ${done} done, ${failed} failed`);
    } catch (e) {
      console.error(`Page ${pageNum} FAILED: ${e.message}`);
      failed++;
    }
  }
}

console.log(`\nDone! ${done} OCR'd, ${skipped} skipped, ${failed} failed`);
