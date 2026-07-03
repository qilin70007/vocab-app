// Debug stripOcrPrefix
function stripOcrPrefix(line) {
  let text = line;
  for (let i = 0; i < 5; i++) {
    const before = text;
    text = text.replace(/^[=\w]+\s+/, '');
    text = text.replace(/^>\s*/, '');
    text = text.replace(/^[=]+\s*/, '');
    if (text === before) break;
  }
  return text.trim();
}

const tests = [
  "> 31. 'after /'a:fto(r)/ prep. TE ZA; TE Ja",
  "== P 26. advise /ad'vaiz/ v. WE, BE, BW",
  "> 1. *ability® /o'biloti/ (4 abilities) n. fEA, AAE, ASI",
];

for (const t of tests) {
  const result = stripOcrPrefix(t);
  const isMain = /^\d+[.,]?\s*\*{0,3}\s*['a-zA-Z]/.test(result);
  console.log(isMain ? 'MATCH' : 'NO', '|', JSON.stringify(t), '->', JSON.stringify(result));
}
