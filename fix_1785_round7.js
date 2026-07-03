/**
 * 第七轮 - 最终清理剩余问题例句
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

// 需要处理的单词 -> 新例句列表
const manualFixes = {
  'allow': [
    'Smoking is not allowed here.',
    'Students are not allowed to use phones in class.'
  ],
  'beautifully': [
    'She sings beautifully.',
    'The room was beautifully decorated.'
  ],
  'dentist': [
    'I have got a toothache, so I must go to a dentist.',
    'My dentist told me to brush twice a day.'
  ],
  'interest': [
    'In the end, he lost interest in learning Japanese.',
    'She showed great interest in music.'
  ],
  'inventor': [
    'The machine is named after its inventor.',
    'Thomas Edison was a famous inventor.'
  ],
  'railway': [
    'The railway is still under construction.',
    'A new railway station will be built next year.'
  ],
  'tip': [
    'He gave the waiter a generous tip.',
    'Can you give me some tips on learning English?'
  ],
};

let changed = 0;

for (const word of words) {
  const fix = manualFixes[word.word.toLowerCase()];
  if (!fix) continue;
  
  const oldEx = word.examples || [];
  word.examples = fix;
  changed++;
  console.log(`[${word.word}] 替换 ${oldEx.length} 个例句 → ${fix.length} 个`);
  oldEx.forEach((e, i) => console.log(`  旧[${i}]: ${e.substring(0, 80)}`));
  fix.forEach((e, i) => console.log(`  新[${i}]: ${e}`));
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');
console.log(`\n总共处理: ${changed} 个单词`);
