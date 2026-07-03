const fs = require('fs');
const data = JSON.parse(fs.readFileSync('words.json', 'utf8'));

const fixes = {
  462: { meaning: 'n. 饮料；喝酒', forms: [] },
  501: { meaning: 'n. 结尾；结束 vt. 结束；终止', forms: ['ended', 'ended', 'ending', 'endings'] },
  654: { meaning: 'n. 前面；正面 adj. 前面的', forms: [] },
  676: { meaning: 'n. 德国人；德语 adj. 德国的；德国人的', forms: ['Germany n.'] },
  740: { meaning: 'n. & vt. 帮助', forms: ['helped', 'helped', 'helping', 'helps'] },
  764: { meaning: 'n. & vt. 希望', forms: ['hoped', 'hoped', 'hoping', 'hopes', 'hopeful adj.', 'hopefully adv.', 'hopeless adj.'] },
  822: { meaning: 'n. & vt. 采访；面试', forms: [] },
  883: { meaning: 'adj. & adv. 晚的/地；迟的/地', forms: ['lately adv.', 'later adj.'] },
  1119: { meaning: 'n. 油漆；颜料 vt. 刷油漆；画', forms: ['painter n.', 'painting n.'] },
};

let changed = 0;
for (const entry of data) {
  const n = entry.number;
  if (fixes[n]) {
    const oldMeaning = entry.meaning;
    const oldForms = entry.forms;
    entry.meaning = fixes[n].meaning;
    entry.forms = fixes[n].forms;
    console.log(`Fixed #${n} "${entry.word}": meaning "&" → "${entry.meaning}"`);
    console.log(`  forms: ${JSON.stringify(oldForms)} → ${JSON.stringify(entry.forms)}`);
    changed++;
  }
}

fs.writeFileSync('words.json', JSON.stringify(data, null, 2), 'utf8');
console.log(`\nDone. Changed ${changed} entries.`);
