const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TESSERACT = 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
const PAGES_DIR = 'E:\\Tina\\自研背单词软件\\pdf_pages';
const OUTPUT_DIR = 'E:\\Tina\\自研背单词软件\\ocr_output';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Extract pages 28 to 258 (zero-padded 4 digits)
const startPage = 28;
const endPage = 258;

for (let i = startPage; i <= endPage; i++) {
  const pageNum = String(i).padStart(4, '0');
  const inputFile = path.join(PAGES_DIR, `page_${pageNum}.png`);
  const outputFile = path.join(OUTPUT_DIR, `page_${pageNum}`);
  
  if (!fs.existsSync(inputFile)) {
    console.log(`Skipping page ${pageNum} - file not found`);
    continue;
  }
  
  if (fs.existsSync(outputFile + '.txt')) {
    console.log(`Page ${pageNum} already OCR'd, skipping`);
    continue;
  }
  
  try {
    execSync(`"${TESSERACT}" "${inputFile}" "${outputFile}" -l eng --psm 6`, {
      timeout: 120000,
      stdio: 'pipe'
    });
    console.log(`Page ${pageNum} done`);
  } catch (e) {
    console.error(`Page ${pageNum} failed: ${e.message}`);
  }
}

console.log('All pages OCR complete!');
