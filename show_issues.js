const r = JSON.parse(require('fs').readFileSync('E:\\Tina\\自研背单词软件\\audit_report_v3.json', 'utf-8'));
console.log('总问题:', r.issues.length);
r.issues.forEach(w => {
  w.problems.forEach(p => {
    console.log('[' + w.word + '] ' + p.issue);
    if (p.value) console.log('  ' + p.value.substring(0, 150));
  });
});
