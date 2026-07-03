/**
 * 批量修复音标 - 通过词典API
 * 对没有IPA符号的音标，从 dictionaryapi.dev 获取正确音标
 */
const fs = require('fs');
const https = require('https');

const words = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words_merged.json', 'utf8'));

function hasIPA(phon) {
  if (!phon) return false;
  return /[əːˈˌæɪɒɑʊɛɔɪʌθðʃʒŋ]/.test(phon);
}

function fetchWord(word) {
  return new Promise((resolve) => {
    https.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (Array.isArray(json) && json.length > 0) {
            // 找所有phonetics中有text的
            const allPhonetics = [];
            for (const entry of json) {
              if (entry.phonetics) {
                for (const p of entry.phonetics) {
                  if (p.text && hasIPA(p.text)) {
                    allPhonetics.push(p.text);
                  }
                }
              }
              if (entry.phonetic && hasIPA(entry.phonetic)) {
                allPhonetics.push(entry.phonetic);
              }
            }
            resolve(allPhonetics[0] || null);
          } else {
            resolve(null);
          }
        } catch(e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function main() {
  // 找出需要修复的词
  const needFix = words.filter(w => !hasIPA(w.phonetic));
  console.log(`需要修复音标: ${needFix.length} 个词`);
  
  let fixed = 0;
  let failed = 0;
  const batchSize = 5; // 并发数
  
  for (let i = 0; i < needFix.length; i += batchSize) {
    const batch = needFix.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(w => fetchWord(w.word)));
    
    for (let j = 0; j < batch.length; j++) {
      const word = batch[j];
      const phon = results[j];
      if (phon) {
        word.phonetic = phon;
        fixed++;
      } else {
        failed++;
      }
    }
    
    // 进度
    if ((i + batchSize) % 50 === 0 || i + batchSize >= needFix.length) {
      console.log(`进度: ${Math.min(i + batchSize, needFix.length)}/${needFix.length} (修复: ${fixed}, 失败: ${failed})`);
    }
    
    // 小延迟避免限流
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\n修复完成: ${fixed} 成功, ${failed} 失败`);
  
  // 验证
  const stillBad = words.filter(w => !hasIPA(w.phonetic));
  console.log(`仍无IPA音标: ${stillBad.length}`);
  if (stillBad.length > 0) {
    console.log('前20个:', stillBad.slice(0, 20).map(w => `${w.word}(${w.phonetic})`).join(', '));
  }
  
  fs.writeFileSync('E:/Tina/自研背单词软件/words_merged.json', JSON.stringify(words, null, 2), 'utf8');
  console.log('已保存: words_merged.json');
}

main().catch(console.error);
