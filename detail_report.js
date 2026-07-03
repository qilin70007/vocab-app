const r = require('./full_check_report.json');
const w = require('./words.json');
const out = [];

out.push('=== meaning_placeholder (词义为&占位符) ===');
r.meaning_placeholder.forEach(v => {
  const entry = w.find(x => x.number === v.num);
  out.push('num:' + v.num + ' word:' + v.word + ' meaning:' + v.meaning);
  out.push('  forms:' + JSON.stringify(entry ? entry.forms : null));
  out.push('  colls:' + JSON.stringify(entry ? entry.collocations : null));
  out.push('  examples:' + JSON.stringify(entry ? entry.examples : null));
});

out.push('\n=== coll_bad (搭配异常) ===');
r.coll_bad.forEach(v => {
  const entry = w.find(x => x.number === v.num);
  out.push('num:' + v.num + ' word:' + v.word + ' collIdx:' + v.collIdx + ' coll:' + v.coll);
  out.push('  all colls:' + JSON.stringify(entry ? entry.collocations : null));
});

out.push('\n=== coll_placeholder ===');
r.coll_placeholder.forEach(v => {
  const entry = w.find(x => x.number === v.num);
  out.push('num:' + v.num + ' word:' + v.word + ' coll:' + v.coll);
  out.push('  all colls:' + JSON.stringify(entry ? entry.collocations : null));
});

out.push('\n=== forms_garbage ===');
r.forms_garbage.forEach(v => {
  const entry = w.find(x => x.number === v.num);
  out.push('num:' + v.num + ' word:' + v.word + ' form:' + v.form);
  out.push('  all forms:' + JSON.stringify(entry ? entry.forms : null));
});

out.push('\n=== examples_garbage ===');
r.examples_garbage.forEach(v => {
  const entry = w.find(x => x.number === v.num);
  out.push('num:' + v.num + ' word:' + v.word + ' example:' + v.example);
  out.push('  all examples:' + JSON.stringify(entry ? entry.examples : null));
});

out.push('\n=== examples_partial_garbage ===');
r.examples_partial_garbage.forEach(v => {
  const entry = w.find(x => x.number === v.num);
  out.push('num:' + v.num + ' word:' + v.word + ' example:' + v.example);
  out.push('  all examples:' + JSON.stringify(entry ? entry.examples : null));
});

out.push('\n=== duplicate_words ===');
r.duplicate_words.forEach(v => {
  out.push('word:' + v.word + ' num1:' + v.firstNum + ' num2:' + v.num);
  const e1 = w.find(x => x.number === v.firstNum);
  const e2 = w.find(x => x.number === v.num);
  out.push('  entry1: ' + JSON.stringify(e1 ? {pos:e1.pos, meaning:e1.meaning} : null));
  out.push('  entry2: ' + JSON.stringify(e2 ? {pos:e2.pos, meaning:e2.meaning} : null));
});

out.push('\n=== examples_no_chinese 统计（按section分组）===');
const noChBySection = {};
r.examples_no_chinese.forEach(v => {
  const entry = w.find(x => x.number === v.num);
  const sec = entry ? entry.section : '?';
  if (!noChBySection[sec]) noChBySection[sec] = [];
  noChBySection[sec].push(v.num + ':' + v.word);
});
Object.keys(noChBySection).sort().forEach(sec => {
  out.push(sec + ': ' + noChBySection[sec].length + ' - ' + noChBySection[sec].slice(0,10).join(', ') + (noChBySection[sec].length > 10 ? '...' : ''));
});

require('fs').writeFileSync('detail_report.txt', out.join('\n'), 'utf8');
console.log('done, lines: ' + out.length);
