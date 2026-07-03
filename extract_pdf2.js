// Extract ALL text from the detailed vocabulary PDF
const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const pdfPath = 'E:\\Tina\\中考考纲\\003-无水印 2026高清中考词汇小绿本+赠送+配套音频\\9. 中考英语考纲词汇（详细版）.pdf';
const outputPath = 'E:\\Tina\\自研背单词软件\\raw_vocab_text.txt';

async function main() {
  const dataBuffer = fs.readFileSync(pdfPath);
  console.log('PDF size:', dataBuffer.length, 'bytes');
  
  const parser = new PDFParse(new Uint8Array(dataBuffer));
  const result = await parser.getText();
  
  fs.writeFileSync(outputPath, result.text, 'utf-8');
  console.log('Total text length:', result.text.length);
  console.log('Pages:', result.total);
  console.log('Done!');
  parser.destroy();
}

main().catch(err => console.error(err));
