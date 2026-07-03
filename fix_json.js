const fs = require('fs');
const path = require('path');

const brokenFiles = [1, 2, 4, 6, 7];

for (const i of brokenFiles) {
  const p = path.join(__dirname, `batch_${i}_done.json`);
  let content = fs.readFileSync(p, 'utf-8');
  
  // Fix unescaped double quotes inside JSON string values
  // Strategy: parse line by line, fix "english" and "chinese" values
  
  // Simple approach: use regex to find "english": "..." and "chinese": "..." 
  // and escape any unescaped quotes inside the value
  
  const lines = content.split('\n');
  const fixedLines = [];
  
  for (let line of lines) {
    const englishMatch = line.match(/^(\s*"english":\s*")(.*)(",?)$/);
    const chineseMatch = line.match(/^(\s*"chinese":\s*")(.*)(",?)$/);
    
    if (englishMatch) {
      const prefix = englishMatch[1];
      let value = englishMatch[2];
      const suffix = englishMatch[3];
      // Escape unescaped double quotes in the value
      value = value.replace(/(?<!\\)"/g, '\\"');
      // But we may have over-escaped, let's be smarter:
      // Actually the issue is quotes that are part of the English text
      // The regex already captured between the first and last quote
      // So just escape all quotes that aren't at the boundaries
      fixedLines.push(prefix + value + suffix);
    } else if (chineseMatch) {
      const prefix = chineseMatch[1];
      let value = chineseMatch[2];
      const suffix = chineseMatch[3];
      value = value.replace(/(?<!\\)"/g, '\\"');
      fixedLines.push(prefix + value + suffix);
    } else {
      fixedLines.push(line);
    }
  }
  
  const fixedContent = fixedLines.join('\n');
  
  try {
    JSON.parse(fixedContent);
    fs.writeFileSync(p, fixedContent, 'utf-8');
    console.log(`batch_${i}_done.json: FIXED and verified`);
  } catch (e) {
    // Try a more aggressive approach - manually fix
    console.log(`batch_${i}_done.json: line-by-line fix failed, trying aggressive fix...`);
    
    // Use a different strategy: extract word, index, english, chinese using more lenient parsing
    const raw = fs.readFileSync(p, 'utf-8');
    const results = [];
    
    // Match objects with word and index
    const wordRegex = /"word":\s*"([^"]+)"/g;
    const indexRegex = /"index":\s*(\d+)/g;
    const englishRegex = /"english":\s*"([\s\S]*?)"(?:,\s*$)/gm;
    const chineseRegex = /"chinese":\s*"([\s\S]*?)"(?:\s*[},])/gm;
    
    const words = [...raw.matchAll(wordRegex)].map(m => m[1]);
    const indices = [...raw.matchAll(indexRegex)].map(m => parseInt(m[1]));
    const englishes = [...raw.matchAll(englishRegex)].map(m => m[1]);
    const chineses = [...raw.matchAll(chineseRegex)].map(m => m[1]);
    
    console.log(`  Found: ${words.length} words, ${indices.length} indices, ${englishes.length} english, ${chineses.length} chinese`);
    
    const count = Math.min(words.length, indices.length, englishes.length, chineses.length);
    for (let j = 0; j < count; j++) {
      results.push({
        word: words[j],
        index: indices[j],
        english: englishes[j],
        chinese: chineses[j]
      });
    }
    
    fs.writeFileSync(p, JSON.stringify(results, null, 2), 'utf-8');
    
    try {
      JSON.parse(fs.readFileSync(p, 'utf-8'));
      console.log(`batch_${i}_done.json: FIXED with aggressive approach (${results.length} items)`);
    } catch (e2) {
      console.log(`batch_${i}_done.json: STILL BROKEN - ${e2.message.substring(0, 100)}`);
    }
  }
}
