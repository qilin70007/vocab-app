const fs = require('fs');
const path = require('path');

const words = require('./words.json');
const ocrDir = 'E:\\Tina\\自研背单词软件\\ocr_output';

// Read all OCR text files
const ocrTexts = {};
const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt'));
for (const f of files) {
  ocrTexts[f] = fs.readFileSync(path.join(ocrDir, f), 'utf8');
}

// Words that still need examples
const missingWords = ['anything', 'directly', 'including', 'infer', 'republic', 'satisfying', 'yogurt'];

function extractExamplesAdvanced(word, ocrTexts) {
  const wl = word.toLowerCase();
  const examples = [];
  const seen = new Set();

  for (const [filename, text] of Object.entries(ocrTexts)) {
    if (examples.length >= 3) break;
    
    // Join all text with newlines preserved for context
    // Split into lines but remember line numbers
    const lines = text.split(/\r?\n/);
    
    for (let i = 0; i < lines.length; i++) {
      if (examples.length >= 3) break;
      
      const lineLower = lines[i].toLowerCase();
      if (!lineLower.includes(wl)) continue;
      
      // Found the word. Now look at this line and next few lines to extract the example.
      // Strategy: combine current + next 2 lines, then extract English sentence + Chinese
      let combined = lines[i];
      if (i + 1 < lines.length) combined += ' ' + lines[i + 1];
      if (i + 2 < lines.length) combined += ' ' + lines[i + 2];
      
      // Try to find English sentence in combined text
      // Pattern: English sentence ending with period, optionally followed by Chinese
      const sentenceMatches = combined.match(/[A-Z][a-zA-Z\s',\-!?;:()"\d]+\./g);
      if (sentenceMatches) {
        for (const m of sentenceMatches) {
          if (examples.length >= 3) break;
          const cleaned = m.trim();
          if (cleaned.toLowerCase().includes(wl) && cleaned.length > 15 && cleaned.length < 250) {
            const wordCount = (cleaned.match(/[a-zA-Z]+/g) || []).length;
            if (wordCount >= 4 && !seen.has(cleaned)) {
              // Try to get Chinese translation from the text after the sentence
              const afterIdx = combined.indexOf(m) + m.length;
              const afterText = combined.substring(afterIdx, afterIdx + 100);
              const chinesePart = afterText.match(/[\u4e00-\u9fff，。；！？、\s]+/);
              let example = cleaned;
              if (chinesePart && chinesePart[0].trim().length > 1) {
                example = cleaned + ' ' + chinesePart[0].trim();
              }
              if (!seen.has(example)) {
                seen.add(example);
                examples.push(example);
              }
            }
          }
        }
      }
      
      // If still no examples, try a more aggressive approach:
      // Look for the word and grab text around it that looks like a sentence
      if (examples.length === 0) {
        const idx = lineLower.indexOf(wl);
        // Go backwards to find sentence start (capital letter after period/newline)
        let start = idx;
        for (let j = idx - 1; j >= 0 && j >= idx - 200; j--) {
          if (combined[j] === '.' || combined[j] === '\n') {
            start = j + 1;
            break;
          }
        }
        // Go forward to find sentence end (period followed by space/Chinese/newline)
        let end = idx + wl.length;
        for (let j = idx + wl.length; j < combined.length && j < idx + 300; j++) {
          if (combined[j] === '.' && (j + 1 >= combined.length || combined[j+1] === ' ' || /[\u4e00-\u9fff\n]/.test(combined[j+1]))) {
            end = j + 1;
            break;
          }
        }
        const extracted = combined.substring(start, end).trim();
        if (extracted.toLowerCase().includes(wl) && extracted.length > 15 && extracted.length < 250) {
          const wordCount = (extracted.match(/[a-zA-Z]+/g) || []).length;
          if (wordCount >= 4 && !seen.has(extracted)) {
            // Get Chinese translation
            const afterText = combined.substring(end, end + 100);
            const chinesePart = afterText.match(/[\u4e00-\u9fff，。；！？、\s]+/);
            let example = extracted;
            if (chinesePart && chinesePart[0].trim().length > 1) {
              example = extracted + ' ' + chinesePart[0].trim();
            }
            seen.add(example);
            examples.push(example);
          }
        }
      }
    }
  }
  
  return examples;
}

// Process missing words
for (const word of missingWords) {
  const item = words.find(w => w.word.toLowerCase() === word);
  if (!item) {
    console.log(word + ': not found in words.json');
    continue;
  }
  
  const examples = extractExamplesAdvanced(word, ocrTexts);
  if (examples.length > 0) {
    item.examples = examples;
    console.log(word + ': found ' + examples.length + ' example(s)');
    for (const ex of examples) {
      console.log('  -> ' + ex.substring(0, 100));
    }
  } else {
    console.log(word + ': STILL NOT FOUND');
  }
}

// Also try 'collocation' - it might not be a real dictionary word in this dataset
const collItem = words.find(w => w.word.toLowerCase() === 'collocation');
if (collItem && (!collItem.examples || collItem.examples.length === 0)) {
  // This word might not have an example in the source PDF. Skip it.
  console.log('collocation: no example in source (likely not a main entry in the PDF)');
}

// Write updated words.json
fs.writeFileSync('words.json', JSON.stringify(words, null, 2), 'utf8');
console.log('\nwords.json updated.');

// Final stats
const noEx = words.filter(w => !w.examples || w.examples.length === 0);
console.log('\nFinal count - words still without examples:', noEx.length);
if (noEx.length > 0) {
  console.log('Remaining:', noEx.map(w => w.word).join(', '));
}
