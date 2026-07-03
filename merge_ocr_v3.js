/**
 * 合并OCR数据 V3 - 修复V2的问题
 * 
 * 修复：
 * 1. 不覆盖任何已有音标（只补充空音标）
 * 2. 更严格的例句过滤
 * 3. 验证例句确实属于该单词
 */

const fs = require('fs');

const existing = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf8'));
const ocr = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words_enhanced.json', 'utf8'));

const ocrMap = new Map();
for (const e of ocr) {
  ocrMap.set(e.word.toLowerCase(), e);
}

// 判断音标是否有效（不是OCR乱码）
function isValidPhonetic(phon) {
  if (!phon) return false;
  // 去掉方括号和斜杠
  const p = phon.replace(/[\[\]\/]/g, '').trim();
  if (p.length < 2) return false;
  // OCR乱码音标特征：包含'（撇号）后跟辅音，或者完全没有音标符号
  // 有效音标应该包含元音标记或常见音标字符
  // 简单判断：如果原有音标包含[ə]或[ː]或[ˈ]等标准音标符号，就是有效的
  if (/[əːˈˌæɪɒɑʊɛɔɪʌ]/.test(p)) return true;
  // 如果只有字母和撇号，可能是OCR乱码
  if (/^[a-z'.,:]+$/i.test(p) && p.length < 15) return false;
  return true;
}

// 判断是否是中文乱码
function isGarbledText(text) {
  if (/[\u4e00-\u9fff]/.test(text)) return false; // 有真实中文，不是乱码
  
  const lowerWords = text.match(/[a-z]{4,}/g) || [];
  const knownWords = new Set(['the', 'and', 'was', 'were', 'with', 'that', 'this', 'have', 'from', 'they', 'been', 'more', 'will', 'some', 'what', 'about', 'there', 'their', 'would', 'could', 'should', 'very', 'only', 'than', 'then', 'into', 'over', 'after', 'never', 'where', 'which', 'while', 'being', 'other', 'these', 'those', 'before', 'because', 'between', 'during', 'without', 'time', 'like', 'make', 'take', 'come', 'good', 'look', 'only', 'want', 'need', 'know', 'think', 'find', 'give', 'tell', 'work', 'call', 'feel', 'become', 'leave', 'mean', 'keep', 'let', 'begin', 'seem', 'help', 'talk', 'turn', 'start', 'show', 'hear', 'play', 'run', 'move', 'live', 'believe', 'hold', 'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend', 'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build', 'stay', 'fall', 'cut', 'reach', 'kill', 'remain']);
  
  const hasKnownWord = lowerWords.some(w => knownWords.has(w));
  if (hasKnownWord) return false;
  
  // 大量大写辅音组合 = 乱码
  const upperRatio = (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1);
  if (upperRatio > 0.35 && !hasKnownWord) return true;
  
  return false;
}

// 验证例句是否属于该单词
function isRelevantExample(text, word) {
  // 如果例句包含该单词，肯定是相关的
  if (text.toLowerCase().includes(word.toLowerCase())) return true;
  
  // 如果例句不包含该单词，可能是接续行或乱码
  // 检查是否是有效英文句子
  const lowerWords = text.match(/[a-z]{3,}/g) || [];
  const knownWords = new Set(['the', 'and', 'was', 'were', 'with', 'that', 'this', 'have', 'from', 'they', 'been', 'more', 'will', 'some', 'what', 'about', 'there', 'their', 'would', 'could', 'should', 'very', 'only', 'than', 'then', 'into', 'over', 'after', 'never', 'where', 'which', 'while', 'being', 'other', 'these', 'those', 'before', 'because', 'between', 'during', 'without', 'time', 'like', 'make', 'take', 'come', 'good', 'look', 'want', 'need', 'know', 'think', 'find', 'give', 'tell', 'work', 'call', 'feel', 'become', 'leave', 'mean', 'keep', 'let', 'begin', 'seem', 'help', 'talk', 'turn', 'start', 'show', 'hear', 'play', 'run', 'move', 'live', 'believe', 'hold', 'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend', 'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build', 'stay', 'fall', 'cut', 'reach', 'kill', 'remain']);
  
  // 如果不包含目标单词，但包含已知英文单词，可能是接续行
  const hasKnown = lowerWords.some(w => knownWords.has(w));
  if (hasKnown && text.length > 20) return true;
  
  return false;
}

function filterExamples(examples, word) {
  return examples.filter(ex => {
    if (!/[a-zA-Z]{4,}/.test(ex)) return false;
    if (isGarbledText(ex)) return false;
    if (ex.length < 15) return false;
    if (/[|]{2,}/.test(ex)) return false;
    // 过滤包含音标方括号的行（是其他词条的数据）
    if (/\[[əːˈˌæɪɒɑʊɛɔɪʌ]/.test(ex)) return false;
    // 过滤包含 "WORD[" 模式的行（是其他词条）
    if (/[a-zA-Z]+\[/.test(ex)) return false;
    if (!isRelevantExample(ex, word)) return false;
    if (/^[A-Z]/.test(ex) || /[\u4e00-\u9fff]/.test(ex)) return true;
    return false;
  });
}

// 清理forms
function cleanForms(forms) {
  if (!forms || !Array.isArray(forms)) return [];
  return forms.filter(f => {
    if (!f.form) return false;
    if (f.form.includes('[') || f.form.includes('/')) return false;
    if (f.form.length > 30) return false;
    if (/^\d/.test(f.form)) return false;
    // form应该是单个英文词
    if (!/^[a-zA-Z][a-zA-Z\-'\s]{0,20}$/.test(f.form)) return false;
    return true;
  });
}

let matched = 0, examplesAdded = 0, derivAdded = 0, formsCleaned = 0, phonFixed = 0;

for (const w of existing) {
  // 清理原有forms
  const origCount = w.forms ? w.forms.length : 0;
  w.forms = cleanForms(w.forms);
  if (w.forms.length < origCount) formsCleaned++;
  
  // 修复无效音标
  if (!isValidPhonetic(w.phonetic)) {
    const ocrEntry = ocrMap.get(w.word.toLowerCase());
    if (ocrEntry && ocrEntry.phonetic) {
      // 尝试从OCR获取音标，但先验证
      const ocrPhon = ocrEntry.phonetic;
      // OCR音标也需要验证，跳过明显乱码
      if (!/[|{}]/.test(ocrPhon) && ocrPhon.length > 2 && ocrPhon.length < 30) {
        w.phonetic = '/' + ocrPhon + '/';
        phonFixed++;
      }
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
    
    // 补充例句
    if (ocrEntry.examples.length > 0) {
      const filtered = filterExamples(ocrEntry.examples, w.word);
      if (filtered.length > 0) {
        // 保留原有包含中文的例句，加上OCR英文例句
        const cnExamples = (w.examples || []).filter(ex => /[\u4e00-\u9fff]/.test(ex));
        const combined = [...cnExamples, ...filtered.slice(0, 2)];
        // 去重
        const seen = new Set();
        w.examples = combined.filter(ex => {
          if (seen.has(ex)) return false;
          seen.add(ex);
          return true;
        }).slice(0, 3);
        examplesAdded++;
      }
    }
    
    // 补充派生词
    if (w.forms.length === 0 && ocrEntry.derivatives.length > 0) {
      w.forms = ocrEntry.derivatives
        .filter(d => d.word && /^[a-zA-Z][a-zA-Z\-']*$/.test(d.word))
        .map(d => ({
          form: d.word,
          desc: d.pos ? `${d.pos} ${d.meaning || ''}`.trim() : (d.meaning || '')
        }))
        .filter(d => d.form !== w.word); // 排除与主词相同的
      if (w.forms.length > 0) derivAdded++;
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
    phonetic: isValidPhonetic(w.phonetic),
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
for (const word of ['attractive', 'avoid', 'change', 'cent', 'flower', 'focus']) {
  const e = existing.find(w => w.word === word);
  if (e) {
    console.log(`\n--- ${word} ---`);
    console.log(`  phonetic: ${e.phonetic}`);
    console.log(`  pos: ${e.pos}`);
    console.log(`  meaning: ${e.meaning}`);
    console.log(`  forms: ${JSON.stringify(e.forms)}`);
    console.log(`  examples: ${JSON.stringify(e.examples)}`);
  }
}

fs.writeFileSync('E:/Tina/自研背单词软件/words_merged.json', JSON.stringify(existing, null, 2), 'utf8');
console.log('\n已保存: words_merged.json');
