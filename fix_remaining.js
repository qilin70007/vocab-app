const fs = require('fs');
const path = require('path');

const wordsPath = path.join(__dirname, 'words.json');
const words = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

const manualTranslations = {
  'bad': 'How bad he is! 他真坏！',
  'cat': 'I love cats. 我喜欢猫。',
  'custom': 'It is a local custom. 这是当地的风俗。',
  'decision': 'We need to make a decision. 我们需要做一个决定。',
  'foreigner': 'He is a foreigner. 他是个外国人。',
  'item': 'We ought to pass on to the next item. 我们应该继续下一个议题。',
  'language': 'Studying vocabulary is a key part of language learning. 学习词汇是语言学习的关键部分。',
  'marry': 'Marry me. 嫁给我吧。',
  'pull': 'Pull the door open. 把门拉开。',
  'rebuild': 'The house was rebuilt after the fire. 房子在火灾后重建了。',
  'role': 'She prefers to play comic roles. 她更喜欢演喜剧角色。',
  'snack': 'I only have a snack at lunch time. 午饭我只吃点心。',
  'tennis': 'I practise playing tennis every weekend. 我每个周末练习打网球。',
  'usually': 'I usually go to school by underground. 我通常坐地铁上学。',
};

let updated = 0;
for (const w of words) {
  if (manualTranslations[w.word]) {
    w.examples = [manualTranslations[w.word]];
    updated++;
  }
}

fs.writeFileSync(wordsPath, JSON.stringify(words, null, 2), 'utf-8');

// Final verification
let withCn = 0, withoutCn = 0;
for (const w of words) {
  if (w.examples && w.examples[0] && /[\u4e00-\u9fff]/.test(w.examples[0])) {
    withCn++;
  } else {
    withoutCn++;
  }
}
console.log(`Updated: ${updated}`);
console.log(`Final: ${withCn} with Chinese, ${withoutCn} without Chinese, total ${words.length}`);
