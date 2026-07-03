const fs = require('fs');
const path = 'E:\\Tina\\自研背单词软件\\words.json';
const data = JSON.parse(fs.readFileSync(path, 'utf-8'));

// 乱码搭配修复映射表
const fixes = {
  45: { // alive
    replace: { 'ee TET': 'alive and kicking', 'dead': 'be alive' },
    final: ['be alive to sth', 'alive and kicking']
  },
  149: { // beg
    replace: { 'oe Fs Ail 2H': 'beg for sth' },
    final: ['beg for sth', 'beg sb to do sth']
  },
  155: { // believe
    replace: { 
      'ee WEP': 'believe in sb',
      'belief. fall; fab; faa; Mle': 'believe it or not',
      "believe [bɪ'liːv] v. 相信；认为": 'believe in oneself'
    },
    final: ['believe in sb/sth', 'believe it or not']
  },
  335: { // conclusion
    replace: { 
      'oe Fe A ial2H': 'draw a conclusion',
      'jump to conclusion F246': 'jump to a conclusion'
    },
    final: ['draw/reach a conclusion', 'jump to a conclusion']
  },
  337: { // confidence
    replace: { 'cs IaH': 'have confidence in sth' },
    final: ['have confidence in sth', 'be confident about sth']
  },
  375: { // custom
    replace: { 
      'are. He RAR FEE RAST, MAST AHL RIL 9 Be de AR.': 'local custom',
      'ee HGR': 'customs duty'
    },
    final: ['local custom', 'customs duty']
  },
  547: { // experience
    replace: { 
      'good at it. MILF RAS R AMMA, (ERR, RARBRRAT': 'gain experience',
      'ce WET': 'experienced in sth',
      'ePTRN; NAM" it, ea.': 'practical experience'
    },
    final: ['gain experience', 'experienced in sth']
  },
  626: { // foreign
    replace: { 'ee TER': 'foreign language' },
    final: ['foreign language', 'foreign country']
  },
  699: { // greet
    replace: { 
      'ce EIR': 'greet sb with a smile',
      'ee He Ali': 'greet each other'
    },
    final: ['greet sb with a smile', 'greet each other']
  },
  784: { // hunt
    replace: { 
      'ee TEP': 'hunt for sth',
      'hunt [hʌnt]v. 打猎': 'go hunting'
    },
    final: ['hunt for sth', 'go hunting', 'hunt for a job']
  },
  1198: { // pollute
    replace: { 'cs ETRE': 'pollute the environment' },
    final: ['pollute the environment', 'polluted by sth']
  },
  1278: { // ready
    replace: { 
      'oe Fe Niaz': 'be ready for sth',
      'be/get ready for ------VEYER': 'get ready to do sth'
    },
    final: ['be/get ready for sth', 'get ready to do sth']
  },
  1285: { // recent
    replace: { 'ce EAB': 'in recent years' },
    final: ['in recent years', 'recent development']
  },
  1297: { // relax
    replace: { 'cs TATE': 'relax oneself' },
    final: ['relax oneself', 'take a relax']
  },
  1313: { // responsibility
    replace: { 
      'ee HBT': 'take responsibility for sth',
      '(2) have a sense of responsibility 具有责任感': 'have a sense of responsibility'
    },
    final: ['take responsibility for sth', 'have a sense of responsibility']
  },
  1357: { // salt
    replace: { 'ce WER': 'table salt' },
    final: ['table salt', 'salty food']
  },
  1512: { // strange
    replace: { 'cs WEIR': 'be strange to sb' },
    final: ['be strange to sb', 'strange to say']
  },
  1703: { // warm
    replace: { 'oe WIE Ta Ne': 'warm up' },
    final: ['warm up', 'keep warm']
  }
};

let changed = 0;
for (const [num, fix] of Object.entries(fixes)) {
  const word = data.find(w => w.number === parseInt(num));
  if (!word) {
    console.log(`WARN: word num=${num} not found`);
    continue;
  }
  console.log(`Fixing num=${num} word=${word.word}`);
  console.log(`  Old collocations: ${JSON.stringify(word.collocations)}`);
  word.collocations = fix.final;
  console.log(`  New collocations: ${JSON.stringify(word.collocations)}`);
  changed++;
}

fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
console.log(`\nTotal fixed: ${changed} words`);
console.log('Done.');
