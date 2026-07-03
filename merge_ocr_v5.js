/**
 * 最终合并 V5 - 从头构建干净数据
 * 
 * 策略：
 * 1. 从原有words.json出发（中文释义、音标已经修好）
 * 2. 彻底清空examples和forms（原有数据污染严重）
 * 3. 只从OCR补充英文例句（严格验证）
 * 4. 只从OCR补充派生词（严格验证）
 * 5. 修复OCR乱码音标
 */

const fs = require('fs');

const existing = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf8'));
const ocr = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words_enhanced.json', 'utf8'));

const ocrMap = new Map();
for (const e of ocr) {
  ocrMap.set(e.word.toLowerCase(), e);
}

// 检查音标是否包含标准IPA符号
function hasIPA(phon) {
  if (!phon) return false;
  return /[əːˈˌæɪɒɑʊɛɔɪʌθðʃʒŋ]/.test(phon);
}

// 判断是否是OCR乱码音标
function isOCRGarbledPhonetic(phon) {
  if (!phon) return false;
  const cleaned = phon.replace(/[\[\]\/]/g, '').trim();
  if (/[əːˈˌæɪɒɑʊɛɔɪʌθðʃʒŋ]/.test(cleaned)) return false;
  // 纯字母+撇号 = OCR乱码
  if (/^[a-z'.,:;|]+$/i.test(cleaned)) return true;
  return false;
}

// 验证例句
function validateExample(ex, word) {
  if (!ex || ex.length < 15 || ex.length > 200) return false;
  const exLower = ex.toLowerCase();
  const wordLower = word.toLowerCase();
  
  // 必须包含目标单词
  if (!exLower.includes(wordLower)) return false;
  
  // 排除包含音标方括号的行
  if (/\[[əːˈˌæɪɒɑʊɛɔɪʌ]/.test(ex)) return false;
  if (/[a-zA-Z]+\[\w/.test(ex)) return false;
  
  // 排除标记行
  if (/^[=&>]/.test(ex)) return false;
  
  // 必须有至少2个小写英文词
  const lowerWords = ex.match(/[a-z]{2,}/g) || [];
  if (lowerWords.length < 2) return false;
  
  // 排除包含太多大写字母的行（乱码）
  const upperCount = (ex.match(/[A-Z]/g) || []).length;
  if (upperCount > ex.length * 0.35) return false;
  
  return true;
}

// 验证派生词
function validateDerivative(d, mainWord) {
  if (!d.word) return false;
  if (d.word.toLowerCase() === mainWord.toLowerCase()) return false;
  if (!/^[a-zA-Z][a-zA-Z\-']{1,20}$/.test(d.word)) return false;
  return true;
}

let matched = 0, examplesAdded = 0, derivAdded = 0, phonFixed = 0;

for (const w of existing) {
  // 修复OCR乱码音标
  if (w.phonetic && !hasIPA(w.phonetic)) {
    // 音标无IPA符号，可能被OCR乱码污染了
    // 尝试从OCR获取更好的音标
    const ocrEntry = ocrMap.get(w.word.toLowerCase());
    if (ocrEntry && ocrEntry.phonetic && !isOCRGarbledPhonetic(ocrEntry.phonetic)) {
      w.phonetic = '/' + ocrEntry.phonetic + '/';
      phonFixed++;
    }
    // 如果OCR也不可用，保留原有（至少有音标格式）
  }
  
  // 补充空音标
  if (!w.phonetic || w.phonetic === '[]' || w.phonetic === '') {
    const ocrEntry = ocrMap.get(w.word.toLowerCase());
    if (ocrEntry && ocrEntry.phonetic && !isOCRGarbledPhonetic(ocrEntry.phonetic)) {
      w.phonetic = '/' + ocrEntry.phonetic + '/';
      phonFixed++;
    }
  }
  
  // 清理collocations
  if (w.collocations) {
    w.collocations = w.collocations.filter(c => {
      if (!c.eng) return false;
      if (c.eng.includes('___')) return false;
      if (/^\d+[.)]/.test(c.eng)) return false;
      // 排除混入其他词条的
      if (/\[[əːˈˌæɪɒɑʊɛɔɪʌ]/.test(c.eng)) return false;
      return true;
    });
  }
  
  // 清理原有forms（移除包含音标的数据）
  if (w.forms) {
    w.forms = w.forms.filter(f => {
      if (!f.form) return false;
      if (f.form.includes('[') || f.form.includes('/')) return false;
      if (f.form.length > 25) return false;
      if (!/^[a-zA-Z][a-zA-Z\-']{0,20}$/.test(f.form)) return false;
      // 排除desc中包含OCR乱码的
      if (f.desc && /[A-Z]{4,}/.test(f.desc) && !/[\u4e00-\u9fff]/.test(f.desc)) return false;
      return true;
    });
  }
  
  const ocrEntry = ocrMap.get(w.word.toLowerCase());
  if (ocrEntry) {
    matched++;
    
    // 从OCR补充例句
    const ocrExamples = (ocrEntry.examples || []).filter(ex => validateExample(ex, w.word));
    
    // 保留原有有中文的例句（这些是人工写的，质量好）
    const cnExamples = (w.examples || []).filter(ex => {
      if (!/[\u4e00-\u9fff]/.test(ex)) return false; // 必须有中文
      if (/\[[əːˈˌæɪɒɑʊɛɔɪʌ]/.test(ex)) return false; // 排除混入的音标
      if (!ex.toLowerCase().includes(w.word.toLowerCase())) {
        // 如果不包含目标单词，检查是否是相关例句
        // 有些中文例句格式是 "英文句子 中文翻译"
        const engPart = ex.match(/^[A-Za-z\s',.\-!?]+/);
        if (engPart && engPart[0].toLowerCase().includes(w.word.toLowerCase())) {
          return true;
        }
        return false;
      }
      return true;
    });
    
    const combined = [...cnExamples, ...ocrExamples.slice(0, 2)];
    const seen = new Set();
    const newExamples = combined.filter(ex => {
      const key = ex.substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 3);
    
    if (newExamples.length > 0) {
      w.examples = newExamples;
      examplesAdded++;
    }
    
    // 从OCR补充派生词
    if (w.forms.length === 0) {
      const derivs = (ocrEntry.derivatives || [])
        .filter(d => validateDerivative(d, w.word))
        .map(d => ({
          form: d.word,
          desc: d.pos ? `${d.pos} ${d.meaning || ''}`.trim() : (d.meaning || '')
        }));
      if (derivs.length > 0) {
        w.forms = derivs;
        derivAdded++;
      }
    }
  }
}

console.log('匹配到:', matched);
console.log('例句补充:', examplesAdded);
console.log('派生词补充:', derivAdded);
console.log('音标修复:', phonFixed);

// 质量统计
let stats = { phonetic: 0, meaning: 0, forms: 0, collocations: 0, examples: 0, allFive: 0 };
for (const w of existing) {
  const has = {
    phonetic: w.phonetic && (hasIPA(w.phonetic) || w.phonetic.length > 2),
    meaning: w.meaning && w.meaning.length > 0,
    forms: w.forms && w.forms.length > 0,
    collocations: w.collocations && w.collocations.length > 0,
    examples: w.examples && w.examples.length > 0
  };
  if (has.phonetic) stats.phonetic++;
  if (has.meaning) stats.meaning++;
  if (has.forms) stats.forms++;
  if (has.collocations) stats.collocations++;
  if (has.examples) stats.examples++;
  if (Object.values(has).every(v => v)) stats.allFive++;
}

const total = existing.length;
console.log('\n=== 质量统计 ===');
console.log(`音标(含IPA): ${stats.phonetic}/${total} (${(stats.phonetic/total*100).toFixed(1)}%)`);
console.log(`释义: ${stats.meaning}/${total} (${(stats.meaning/total*100).toFixed(1)}%)`);
console.log(`forms: ${stats.forms}/${total} (${(stats.forms/total*100).toFixed(1)}%)`);
console.log(`搭配: ${stats.collocations}/${total} (${(stats.collocations/total*100).toFixed(1)}%)`);
console.log(`例句: ${stats.examples}/${total} (${(stats.examples/total*100).toFixed(1)}%)`);
console.log(`五项全有: ${stats.allFive}/${total} (${(stats.allFive/total*100).toFixed(1)}%)`);

// 预览
for (const word of ['attractive', 'avoid', 'change', 'cent', 'flower', 'focus', 'available', 'audience', 'autumn', 'award']) {
  const e = existing.find(w => w.word === word);
  if (e) {
    console.log(`\n--- ${word} ---`);
    console.log(`  phonetic: ${e.phonetic}`);
    console.log(`  meaning: ${e.meaning}`);
    console.log(`  forms: ${JSON.stringify(e.forms)}`);
    console.log(`  collocations: ${JSON.stringify(e.collocations)}`);
    console.log(`  examples: ${JSON.stringify(e.examples)}`);
  }
}

fs.writeFileSync('E:/Tina/自研背单词软件/words_merged.json', JSON.stringify(existing, null, 2), 'utf8');
console.log('\n已保存: words_merged.json');
