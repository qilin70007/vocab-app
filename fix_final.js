const fs = require('fs');
const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

for (const word of words) {
  if (word.word === 'work out' && !word.phonetic) {
    word.phonetic = '[wɜːk aʊt]';
    console.log('已补充 work out 音标:', word.phonetic);
  }
  // 修正 snack 例句
  if (word.word === 'snack') {
    word.examples = word.examples.map(e => {
      if (e.startsWith('only have')) return 'I only have a snack at lunch time.';
      return e;
    });
    console.log('已修正 snack 例句');
  }
  // 修正 this 例句
  if (word.word === 'this') {
    word.examples = word.examples.map(e => {
      if (e.startsWith('this coat')) return 'I like this coat better than that one.';
      return e;
    });
    console.log('已修正 this 例句');
  }
  // 修正 daily 例句被截断
  if (word.word === 'daily') {
    word.examples = word.examples.map(e => {
      if (e.includes('8:30 a.m.')) return 'The Visitor Centre is open daily from 8:30 a.m. to 4:30 p.m.';
      return e;
    });
    console.log('已修正 daily 例句');
  }
  // 修正 beauty 被截断
  if (word.word === 'beauty') {
    word.examples = word.examples.filter(e => !e.startsWith('~~ 142.'));
    if (word.examples.length === 0) {
      word.examples = ['Beauty is in the eye of the beholder.'];
    }
    console.log('已修正 beauty 例句');
  }
}

fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2), 'utf-8');
console.log('完成');
