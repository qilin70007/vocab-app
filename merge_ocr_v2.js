/**
 * 合并OCR数据和现有words.json - V2
 * 
 * 策略：
 * 1. 保留原有words.json的中文释义、音标（已经修好的）
 * 2. 从OCR补充英文例句（过滤掉中文乱码行）
 * 3. 从OCR补充派生词（只在forms为空时）
 * 4. 不覆盖原有音标
 * 5. 清理原有forms中的错误数据
 */

const fs = require('fs');

const existing = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf8'));
const ocr = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words_enhanced.json', 'utf8'));

// 建立OCR索引
const ocrMap = new Map();
for (const e of ocr) {
  ocrMap.set(e.word.toLowerCase(), e);
}

// 判断一个字符串是否是中文乱码（OCR把中文读成的乱码英文字符）
// 特征：大量大写辅音字母组合，没有有意义的英文单词
function isGarbledText(text) {
  // 纯中文（被OCR读成乱码）
  // 这些行通常：没有小写英文单词（除了常见介词），大量大写字母，长度较短
  
  // 如果包含有意义的英文单词（4个以上小写字母），则不是乱码
  const lowerWords = text.match(/[a-z]{4,}/g);
  if (lowerWords && lowerWords.length >= 1) {
    // 检查是否是真正的英文单词而非乱码
    const knownWords = ['the', 'and', 'was', 'were', 'with', 'that', 'this', 'have', 'from', 'they', 'been', 'more', 'will', 'some', 'what', 'about', 'there', 'their', 'would', 'could', 'should', 'very', 'only', 'than', 'then', 'into', 'over', 'after', 'never', 'where', 'which', 'while', 'being', 'other', 'these', 'those', 'before', 'because', 'between', 'during', 'without'];
    const hasKnown = lowerWords.some(w => knownWords.includes(w) || w.length >= 5);
    if (hasKnown) return false;
  }
  
  // 检查是否主要是大写字母组合（乱码特征）
  const upperRatio = (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1);
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  
  // 如果有中文，不是乱码
  if (hasChinese) return false;
  
  // 如果大部分是大写字母且没有有意义的英文，可能是乱码
  if (upperRatio > 0.4 && !lowerWords) return true;
  
  // 短行且主要是大写/特殊字符
  if (text.length < 40 && upperRatio > 0.5) return true;
  
  return false;
}

// 过滤例句：保留有意义的英文句子
function filterExamples(examples) {
  return examples.filter(ex => {
    // 必须包含英文
    if (!/[a-zA-Z]{4,}/.test(ex)) return false;
    
    // 过滤乱码
    if (isGarbledText(ex)) return false;
    
    // 过滤太短的行
    if (ex.length < 15) return false;
    
    // 过滤包含特殊OCR字符的行
    if (/[|]{2,}/.test(ex)) return false;
    
    // 保留以大写字母开头的句子（正常例句）
    if (/^[A-Z]/.test(ex)) return true;
    
    // 保留包含中文的行（真实中文翻译）
    if (/[\u4e00-\u9fff]/.test(ex)) return true;
    
    return false;
  });
}

// 清理forms：移除包含多个单词的forms（明显是数据错误）
function cleanForms(forms) {
  if (!forms || !Array.isArray(forms)) return [];
  return forms.filter(f => {
    if (!f.form) return false;
    // form应该是单个词或短词组，不应该包含音标和词性
    if (f.form.includes('[') || f.form.includes('/')) return false;
    // 不应该太长
    if (f.form.length > 30) return false;
    // 不应该包含数字开头（如"1." "2."）
    if (/^\d/.test(f.form)) return false;
    return true;
  });
}

let matched = 0;
let examplesAdded = 0;
let derivAdded = 0;
let formsCleaned = 0;

for (const w of existing) {
  // 清理原有forms
  const origFormsCount = w.forms ? w.forms.length : 0;
  w.forms = cleanForms(w.forms);
  if (w.forms.length < origFormsCount) formsCleaned++;
  
  const ocrEntry = ocrMap.get(w.word.toLowerCase());
  
  if (ocrEntry) {
    matched++;
    
    // 不覆盖音标（原有的已经修好了）
    // 只在音标为空时补充
    if (!w.phonetic || w.phonetic === '[]' || w.phonetic === '') {
      if (ocrEntry.phonetic) {
        w.phonetic = '/' + ocrEntry.phonetic + '/';
      }
    }
    
    // 补充英文例句
    if (ocrEntry.examples.length > 0) {
      const filtered = filterExamples(ocrEntry.examples);
      if (filtered.length > 0) {
        // 合并例句：保留原有中文例句，加上OCR英文例句
        const existingExamples = (w.examples || []).filter(ex => /[\u4e00-\u9fff]/.test(ex)); // 保留有中文的例句
        w.examples = [...new Set([...existingExamples, ...filtered.slice(0, 2)])].slice(0, 3);
        examplesAdded++;
      }
    }
    
    // 补充派生词（只在forms为空时）
    if (w.forms.length === 0 && ocrEntry.derivatives.length > 0) {
      w.forms = ocrEntry.derivatives
        .filter(d => d.word && /^[a-zA-Z][a-zA-Z\-']*$/.test(d.word))
        .map(d => ({
          form: d.word,
          desc: d.pos ? `${d.pos} ${d.meaning || ''}`.trim() : (d.meaning || '')
        }));
      if (w.forms.length > 0) derivAdded++;
    }
  }
  
  // 清理collocations中的错误数据
  if (w.collocations) {
    w.collocations = w.collocations.filter(c => {
      if (!c.eng) return false;
      // 移除包含___的占位符
      if (c.eng.includes('___')) return false;
      // 移除数字编号开头的
      if (/^\d+[.)]/.test(c.eng)) return false;
      return true;
    });
  }
}

console.log('匹配到:', matched);
console.log('例句补充:', examplesAdded);
console.log('派生词补充:', derivAdded);
console.log('forms清理:', formsCleaned);

// 质量统计
let stats = {
  phonetic: 0, meaning: 0, forms: 0, collocations: 0, examples: 0, allFive: 0
};
for (const w of existing) {
  const has = {
    phonetic: w.phonetic && w.phonetic.length > 2,
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
console.log('\n--- 预览 attractive ---');
const a = existing.find(w => w.word === 'attractive');
if (a) console.log(JSON.stringify(a, null, 2));

console.log('\n--- 预览 avoid ---');
const av = existing.find(w => w.word === 'avoid');
if (av) console.log(JSON.stringify(av, null, 2));

console.log('\n--- 预览 change ---');
const c = existing.find(w => w.word === 'change');
if (c) console.log(JSON.stringify(c, null, 2));

fs.writeFileSync('E:/Tina/自研背单词软件/words_merged.json', JSON.stringify(existing, null, 2), 'utf8');
console.log('\n已保存: words_merged.json');
