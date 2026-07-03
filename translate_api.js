const fs = require('fs');
const path = require('path');
const https = require('https');

const words = JSON.parse(fs.readFileSync(path.join(__dirname, 'words.json'), 'utf-8'));
const queue = JSON.parse(fs.readFileSync(path.join(__dirname, 'translation_queue.json'), 'utf-8'));

// Split cleaned text into sentences, keep first 1-2 good ones
function pickSentences(text) {
  const sentences = text.match(/[A-Z"'][^.!?]*[.!?]/g) || [];
  const good = sentences.filter(s => {
    const trimmed = s.trim();
    if (trimmed.length < 15) return false;
    if (/\b(n\.|v\.|adj\.|adv\.|pl\.)\b.*\//.test(trimmed)) return false;
    if (/[A-Z][a-z]+ \/[a-z]/.test(trimmed)) return false;
    return true;
  });
  return good.slice(0, 2).join(' ');
}

function translateMyMemory(text) {
  return new Promise((resolve, reject) => {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const translated = parsed.responseData?.translatedText || '';
          if (translated && translated.length > 1) {
            resolve(translated);
          } else {
            reject(new Error('Empty translation. Response: ' + data.substring(0, 200)));
          }
        } catch (e) {
          reject(new Error('Parse error: ' + e.message));
        }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  // Load existing results if any (for resume)
  let results = [];
  const resultsPath = path.join(__dirname, 'translation_results.json');
  if (fs.existsSync(resultsPath)) {
    results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    console.log(`Resuming: ${results.length}/${queue.length} already processed`);
  }
  
  const startIndex = results.length;
  let success = results.filter(r => r.status === 'ok').length;
  let fail = results.filter(r => r.status?.startsWith('fail')).length;
  let skip = results.filter(r => r.status === 'skip' || r.status === 'skip_no_sentence').length;
  
  console.log(`Starting from index ${startIndex}. Success: ${success}, Fail: ${fail}, Skip: ${skip}`);
  
  for (let i = startIndex; i < queue.length; i++) {
    const item = queue[i];
    
    if (!item.cleaned || item.cleaned.length < 15) {
      skip++;
      results.push({ ...item, translated: null, status: 'skip' });
      continue;
    }
    
    const englishText = pickSentences(item.cleaned);
    if (!englishText || englishText.length < 15) {
      skip++;
      results.push({ ...item, translated: null, status: 'skip_no_sentence' });
      continue;
    }
    
    let translated = '';
    let retries = 3;
    let done = false;
    
    while (retries > 0 && !done) {
      try {
        translated = await translateMyMemory(englishText);
        done = true;
      } catch (e) {
        retries--;
        if (e.message.includes('429') || e.message.includes('rate')) {
          console.log(`  [${i+1}] Rate limited, waiting 5s...`);
          await sleep(5000);
        } else if (retries > 0) {
          console.log(`  [${i+1}] Retry ${3-retries}/3: ${e.message}`);
          await sleep(2000);
        } else {
          fail++;
          results.push({ ...item, english: englishText, translated: null, status: 'fail: ' + e.message });
          console.log(`  [${i+1}] FAIL ${item.word}: ${e.message}`);
        }
      }
    }
    
    if (done && translated) {
      success++;
      results.push({
        ...item,
        english: englishText,
        translated: translated,
        status: 'ok'
      });
      
      if (success % 10 === 0) {
        console.log(`  [${i+1}/${queue.length}] OK: ${success}, Fail: ${fail}, Skip: ${skip}`);
        console.log(`    ${item.word}: ${englishText.substring(0, 50)}... => ${translated.substring(0, 50)}...`);
      }
    }
    
    // Save every 50
    if ((i + 1) % 50 === 0) {
      fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf-8');
      console.log(`  Saved (${i+1}/${queue.length})`);
    }
    
    // Rate limit: 1 request per second (MyMemory free tier)
    await sleep(1100);
  }
  
  // Final save
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nDone! Success: ${success}, Fail: ${fail}, Skip: ${skip}`);
}

main().catch(console.error);
