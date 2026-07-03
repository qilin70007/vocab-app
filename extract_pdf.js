// Extract text from the vocabulary PDF using pdf-parse v2
const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const pdfPath = 'E:\\Tina\\中考考纲\\003-无水印 2026高清中考词汇小绿本+赠送+配套音频\\无水印高清2026中考词汇小绿本3本\\1. 26年初中英语考纲词汇用法手册（最新版）370页.pdf';

async function main() {
  const dataBuffer = fs.readFileSync(pdfPath);
  console.log('PDF size:', dataBuffer.length, 'bytes');
  
  // Convert Buffer to Uint8Array
  const uint8 = new Uint8Array(dataBuffer);
  const parser = new PDFParse(uint8);
  await parser.load();
  
  const info = await parser.getInfo();
  console.log('Info:', JSON.stringify(info).substring(0, 500));
  
  // Extract text page by page
  let allText = '';
  const numPages = info.pages || 370;
  
  for (let i = 1; i <= numPages; i++) {
    try {
      const pageText = await parser.getText(i);
      allText += `\n\n---PAGE ${i}---\n\n` + pageText;
      if (i % 50 === 0) console.log('Processed page', i);
    } catch(e) {
      console.log('Error on page', i, e.message);
    }
  }
  
  fs.writeFileSync('E:\\Tina\\自研背单词软件\\raw_text.txt', allText, 'utf-8');
  console.log('Total text length:', allText.length);
  console.log('First 3000 chars:');
  console.log(allText.substring(0, 3000));
  
  parser.destroy();
}

main().catch(err => console.error(err));
