/**
 * 检查所有单词的拼写和大写问题
 * 1. 单词本身应该大写的（专有名词、国家、语言、月份等）是否大写
 * 2. 例句中第一个字母是否应该大写
 */

const fs = require('fs');
const words = JSON.parse(fs.readFileSync('E:\\Tina\\自研背单词软件\\words.json', 'utf-8'));

// 专有名词列表（应该大写）
const properNouns = new Set([
  'America', 'American', 'Britain', 'British', 'China', 'Chinese', 'Japan', 'Japanese',
  'Australia', 'Australian', 'Canada', 'Canadian', 'France', 'French', 'Germany', 'German',
  'Italy', 'Italian', 'Russia', 'Russian', 'Spain', 'Spanish', 'India', 'Indian',
  'England', 'English', 'Europe', 'European', 'Asia', 'Asian', 'Africa', 'African',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
  'Christmas', 'Easter', 'Thanksgiving', 'Halloween',
  'I', 'God'
]);

const issues = [];

for (const w of words) {
  // 检查单词本身是否应该大写但没大写
  const wordLower = w.word.toLowerCase();
  for (const pn of properNouns) {
    if (pn.toLowerCase() === wordLower && w.word !== pn) {
      issues.push({
        word: w.word,
        type: 'should_be_capitalized',
        current: w.word,
        correct: pn,
        field: 'word'
      });
    }
  }
  
  // 检查变形中应该大写的
  if (w.forms) {
    for (let i = 0; i < w.forms.length; i++) {
      const form = w.forms[i];
      if (typeof form !== 'string') continue;
      // 提取单词部分（如 "American adj."）
      const wordInForm = form.split(/[\s\[\(]/)[0];
      for (const pn of properNouns) {
        if (pn.toLowerCase() === wordInForm.toLowerCase() && wordInForm !== pn) {
          issues.push({
            word: w.word,
            type: 'should_be_capitalized',
            current: form,
            correct: form.replace(wordInForm, pn),
            field: 'forms[' + i + ']'
          });
        }
      }
    }
  }
  
  // 检查搭配中应该大写的
  if (w.collocations) {
    for (let i = 0; i < w.collocations.length; i++) {
      const coll = w.collocations[i];
      if (typeof coll !== 'string') continue;
      // 提取第一个英文单词
      const firstWordMatch = coll.match(/^([A-Za-z]+)/);
      if (firstWordMatch) {
        const fw = firstWordMatch[1];
        for (const pn of properNouns) {
          if (pn.toLowerCase() === fw.toLowerCase() && fw !== pn && /[A-Z]/.test(coll)) {
            // coll 中其他位置已经有大写，说明不是在句首
            // 但这个英文词在中间，应该大写
            // 找到所有该词的出现
            const regex = new RegExp('\\b' + fw + '\\b', 'g');
            const matches = [...coll.matchAll(regex)];
            for (const m of matches) {
              if (m[0] !== pn) {
                issues.push({
                  word: w.word,
                  type: 'should_be_capitalized',
                  current: coll,
                  field: 'collocations[' + i + ']',
                  note: '单词 "' + fw + '" 应改为 "' + pn + '"'
                });
                break;
              }
            }
          }
        }
      }
    }
  }
}

console.log('找到 ' + issues.length + ' 个大写问题\n');
issues.forEach((issue, i) => {
  console.log((i + 1) + '. [' + issue.word + '] ' + issue.field + ': ' + issue.current);
  if (issue.correct) console.log('   应改为: ' + issue.correct);
  if (issue.note) console.log('   说明: ' + issue.note);
});
