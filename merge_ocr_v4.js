/**
 * 合并OCR数据 V4 - 最终版
 * 
 * 核心策略：
 * 1. 绝不覆盖已有有效音标
 * 2. 例句必须包含目标单词才保留
 * 3. forms必须通过严格验证
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
  return /[əːˈˌæɪɒɑʊɛɔɪʌθðʃʒŋˈː]/.test(phon);
}

// OCR音标通常是乱码（只有字母和撇号）
function isOCRGarbledPhonetic(phon) {
  if (!phon) return false;
  const cleaned = phon.replace(/[\[\]\/]/g, '').trim();
  // 如果有IPA符号，不是乱码
  if (/[əːˈˌæɪɒɑʊɛɔɪʌθðʃʒŋ]/.test(cleaned)) return false;
  // 如果只有字母、撇号、冒号、逗号，可能是乱码
  if (/^[a-z'.,:;|]+$/i.test(cleaned)) return true;
  return false;
}

// 过滤例句：必须包含目标单词
function filterExamples(examples, word) {
  if (!examples || examples.length === 0) return [];
  const wordLower = word.toLowerCase();
  
  return examples.filter(ex => {
    if (!ex || ex.length < 15) return false;
    
    // 必须包含目标单词
    if (!ex.toLowerCase().includes(wordLower)) return false;
    
    // 排除包含音标方括号的行（其他词条的数据）
    if (/\[[əːˈˌæɪɒɑʊɛɔɪʌ]/.test(ex)) return false;
    if (/[a-zA-Z]+\[/.test(ex)) return false;
    
    // 排除纯乱码行（无小写英文单词）
    const lowerWords = ex.match(/[a-z]{3,}/g) || [];
    if (lowerWords.length < 1) return false;
    
    return true;
  });
}

// 清理forms
function cleanForms(forms) {
  if (!forms || !Array.isArray(forms)) return [];
  return forms.filter(f => {
    if (!f.form) return false;
    if (f.form.includes('[') || f.form.includes('/')) return false;
    if (f.form.length > 25) return false;
    if (/^\d/.test(f.form)) return false;
    if (!/^[a-zA-Z][a-zA-Z\-']{0,20}$/.test(f.form)) return false;
    return true;
  });
}

let matched = 0, examplesAdded = 0, derivAdded = 0, formsCleaned = 0, phonFixed = 0;

for (const w of existing) {
  // 清理原有forms
  const origCount = w.forms ? w.forms.length : 0;
  w.forms = cleanForms(w.forms);
  if (w.forms.length < origCount) formsCleaned++;
  
  // 只在音标为空或无效时补充
  if (!w.phonetic || w.phonetic === '[]' || w.phonetic === '' || !hasIPA(w.phonetic)) {
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
      return true;
    });
  }
  
  const ocrEntry = ocrMap.get(w.word.toLowerCase());
  if (ocrEntry) {
    matched++;
    
    // 补充例句（严格过滤：必须包含目标单词）
    if (ocrEntry.examples.length > 0) {
      const filtered = filterExamples(ocrEntry.examples, w.word);
      if (filtered.length > 0) {
        // 保留原有包含中文的例句
        const cnExamples = (w.examples || []).filter(ex => /[\u4e00-\u9fff]/.test(ex));
        const combined = [...cnExamples, ...filtered.slice(0, 2)];
        const seen = new Set();
        w.examples = combined.filter(ex => {
          if (seen.has(ex)) return false;
          seen.add(ex);
          return true;
        }).slice(0, 3);
        examplesAdded++;
      }
    }
    
    // 补充派生词（严格：forms为空时才补充）
    if (w.forms.length === 0 && ocrEntry.derivatives.length > 0) {
      const derivs = ocrEntry.derivatives
        .filter(d => d.word && /^[a-zA-Z][a-zA-Z\-']*$/.test(d.word) && d.word.toLowerCase() !== w.word.toLowerCase())
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
console.log('forms清理:', formsCleaned);
console.log('音标修复:', phonFixed);

// 质量统计
let stats = { phonetic: 0, meaning: 0, forms: 0, collocations: 0, examples: 0, allFive: 0 };
for (const w of existing) {
  const has = {
    phonetic: w.phonetic && w.phonetic.length > 2 && hasIPA(w.phonetic),
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
console.log(`音标: ${stats.phonetic}/${total} (${(stats.phonetic/total*100).toFixed(1)}%)`);
console.log(`释义: ${stats.meaning}/${total} (${(stats.meaning/total*100).toFixed(1)}%)`);
console.log(`forms: ${stats.forms}/${total} (${(stats.forms/total*100).toFixed(1)}%)`);
console.log(`搭配: ${stats.collocations}/${total} (${(stats.collocations/total*100).toFixed(1)}%)`);
console.log(`例句: ${stats.examples}/${total} (${(stats.examples/total*100).toFixed(1)}%)`);
console.log(`五项全有: ${stats.allFive}/${total} (${(stats.allFive/total*100).toFixed(1)}%)`);

// 预览
for (const word of ['attractive', 'avoid', 'change', 'cent', 'flower', 'focus', 'available', 'audience']) {
  const e = existing.find(w => w.word === word);
  if (e) {
    console.log(`\n--- ${word} ---`);
    console.log(`  phonetic: ${e.phonetic}`);
    console.log(`  meaning: ${e.meaning}`);
    console.log(`  forms: ${JSON.stringify(e.forms)}`);
    console.log(`  examples: ${JSON.stringify(e.examples)}`);
  }
}

fs.writeFileSync('E:/Tina/自研背单词软件/words_merged.json', JSON.stringify(existing, null, 2), 'utf8');
console.log('\n已保存: words_merged.json');
