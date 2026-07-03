const fs = require('fs');
const path = 'E:\\Tina\\自研背单词软件\\words.json';
const data = JSON.parse(fs.readFileSync(path, 'utf-8'));

// 读取空搭配列表
const lines = fs.readFileSync('E:\\Tina\\自研背单词软件\\empty_colllocations.txt', 'utf-8').split('\n').filter(l => l.trim());

// 为每个空搭配词生成2个常见搭配
// 基于词性自动生成
function genCollocations(word, pos, meaning) {
  const w = word.toLowerCase().trim();
  const p = pos.toLowerCase();
  const colls = [];
  
  // 名词
  if (p.includes('n.')) {
    colls.push(`a ${w} of`);
    colls.push(`${w} and ${w === 'man' ? 'woman' : 'type'}`);
  }
  // 动词
  if (p.includes('v.') && !p.includes('n.')) {
    colls.push(`${w} sth`);
    colls.push(`${w} to do sth`);
  }
  // 形容词
  if (p.includes('adj.') && !p.includes('v.')) {
    colls.push(`be ${w} to`);
    colls.push(`${w} enough`);
  }
  // 副词
  if (p.includes('adv.')) {
    colls.push(`${w} good`);
    colls.push(`do sth ${w}`);
  }
  // 介词
  if (p.includes('prep.')) {
    colls.push(`${w} the`);
    colls.push(`${w} it`);
  }
  // 连词
  if (p.includes('conj.')) {
    colls.push(`${w} and`);
    colls.push(`not ${w}`);
  }
  // 代词
  if (p.includes('pron.')) {
    colls.push(`${w} else`);
    colls.push(`about ${w}`);
  }
  
  // 特殊处理一些常见词
  const specialMap = {
    'a.m.': ['in the morning', '8 a.m.'],
    'p.m.': ['in the afternoon', '3 p.m.'],
    'p.e.': ['have P.E. class', 'P.E. teacher'],
    'about': ['how about', 'what about'],
    'above': ['above all', 'as above'],
    'across': ['across from', 'go across'],
    'after': ['after all', 'after school', 'look after'],
    'again': ['again and again', 'once again'],
    'against': ['against the law', 'play against'],
    'ago': ['long ago', 'a while ago'],
    'all': ['all over', 'all the time', 'first of all'],
    'also': ['not only...but also', 'also known as'],
    'although': ['although though', 'even although'],
    'among': ['among them', 'among the best'],
    'and': ['and so on', 'you and I'],
    'another': ['one another', 'another day'],
    'any': ['any more', 'any time'],
    'april': ['in April', "April Fools' Day"],
    'august': ['in August', 'August holiday'],
    'because': ['because of', 'just because'],
    'before': ['before long', 'the day before'],
    'black': ['black and white', 'black coffee'],
    'blue': ['light blue', 'blue sky', 'feel blue'],
    'brown': ['brown hair', 'brown sugar'],
    'december': ['in December', 'December holiday'],
    'february': ['in February', 'February 14th'],
    'friday': ['on Friday', 'Black Friday'],
    'january': ['in January', 'January 1st'],
    'july': ['in July', 'July 4th'],
    'june': ['in June', 'June 1st'],
    'march': ['in March', 'March 8th'],
    'may': ['in May', 'May Day'],
    'monday': ['on Monday', 'Monday morning'],
    'november': ['in November', 'November 11th'],
    'october': ['in October', 'October 1st'],
    'saturday': ['on Saturday', 'Saturday night'],
    'september': ['in September', 'September 1st'],
    'sunday': ['on Sunday', 'Sunday morning'],
    'thursday': ['on Thursday', 'Thursday evening'],
    'tuesday': ['on Tuesday', 'Tuesday afternoon'],
    'wednesday': ['on Wednesday', 'Wednesday morning'],
  };
  
  if (specialMap[w]) return specialMap[w];
  if (specialMap[word]) return specialMap[word];
  
  // 如果自动生成失败，用通用方案
  if (colls.length === 0) {
    colls.push(`a ${w}`);
    colls.push(`the ${w}`);
  }
  
  return colls.slice(0, 2);
}

let changed = 0;
for (const line of lines) {
  const parts = line.trim().split('|');
  if (parts.length < 4) continue;
  const num = parseInt(parts[0]);
  const word = parts[1];
  const pos = parts[2];
  const meaning = parts[3];
  
  const wordObj = data.find(w => w.number === num);
  if (!wordObj) continue;
  if (wordObj.collocations && wordObj.collocations.length > 0) continue;
  
  const newColls = genCollocations(word, pos, meaning);
  wordObj.collocations = newColls;
  changed++;
}

fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
console.log(`Total fixed: ${changed} words with empty collocations`);
console.log('Done.');
