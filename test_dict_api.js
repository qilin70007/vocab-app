// 测试词典API
const https = require('https');

function fetchWord(word) {
  return new Promise((resolve, reject) => {
    https.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (Array.isArray(json) && json.length > 0) {
            const phonetics = json[0].phonetics || [];
            const phonetic = phonetics.find(p => p.text) || phonetics[0];
            resolve(phonetic ? phonetic.text : null);
          } else {
            resolve(null);
          }
        } catch(e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const testWords = ['avoid', 'available', 'audience', 'cent', 'chain', 'balance', 'base', 'basic', 'bath', 'bed'];
  for (const w of testWords) {
    const phon = await fetchWord(w);
    console.log(`${w}: ${phon}`);
  }
}

main().catch(console.error);
