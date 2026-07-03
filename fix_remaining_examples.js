const fs = require('fs');
const words = require('./words.json');

// Manually fix examples based on OCR context
const fixes = {
  'anything': [
    "Alice didn't say anything at the meeting last week, did she? 艾丽丝在上周的会议上什么也没说，是吗？"
  ],
  'directly': [
    "But even if some don't ask it directly, you can feel it. 即使有些人没有直接问，你也能感觉到。"
  ],
  'including': [
    "I've got three days' holiday including New Year's Day. 包括元旦在内我有三天假期。"
  ],
  'republic': [
    "the People's Republic of China 中华人民共和国"
  ],
  'satisfying': [
    "It's very satisfying to see so many of you here. 看到你们这么多人在这里真是太令人满意了。"
  ],
  'yogurt': [
    "Do you have any low-fat yogurt? 你们有低脂酸奶吗？"
  ],
  // infer and collocation have no examples in the source PDF
  'infer': [
    "From the evidence, we can infer that he was present at the scene. 从证据我们可以推断他当时在场。"
  ],
  'collocation': [
    "The collocation of these two words is very common in English. 这两个词的搭配在英语中很常见。"
  ]
};

let fixed = 0;
for (const [word, examples] of Object.entries(fixes)) {
  const item = words.find(w => w.word.toLowerCase() === word);
  if (item) {
    item.examples = examples;
    fixed++;
    console.log(word + ': ' + examples.length + ' example(s) set');
  }
}

fs.writeFileSync('words.json', JSON.stringify(words, null, 2), 'utf8');
console.log('\nTotal fixed:', fixed);

// Final check
const noEx = words.filter(w => !w.examples || w.examples.length === 0);
console.log('Words still without examples:', noEx.length);
if (noEx.length > 0) {
  console.log('Remaining:', noEx.map(w => w.word).join(', '));
}
