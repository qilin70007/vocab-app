// Debug isMainEntryLine for specific lines
const lines = [
  "> 31. 'after /'a:fto(r)/ prep. TE ZA; TE Ja",
  "== P 26. advise /ad'vaiz/ v. WE, BE, BW",
  "27. *affect /o'fekt/ v. R2MA; (RR YY",
  "> 28. *afford /a'fo.d/ v. HFA; HAAS (ATTA)",
];

function isMainEntryLine(line) {
  if (!line) return false;
  const text = line.replace(/^(?:=\w*\s*)?>\s*/, '').replace(/^[=\w]+\s+>\s*/, '').replace(/^>\s*/, '').replace(/^[=\w]+\s+/, '');
  return /^\d+[.,]?\s*\*{0,3}\s*[a-zA-Z]/.test(text);
}

for (const line of lines) {
  console.log(isMainEntryLine(line) ? 'MATCH' : 'NO', '|', line.substring(0, 60));
}

// Check: does "after" line match?
const afterLine = "> 31. 'after /'a:fto(r)/ prep. TE ZA; TE Ja";
let text = afterLine.replace(/^(?:=\w*\s*)?>\s*/, '');
console.log('\nAfter step1:', JSON.stringify(text));
text = text.replace(/^[=\w]+\s+>\s*/, '');
console.log('After step2:', JSON.stringify(text));
text = text.replace(/^>\s*/, '');
console.log('After step3:', JSON.stringify(text));
text = text.replace(/^[=\w]+\s+/, '');
console.log('After step4:', JSON.stringify(text));
console.log('Match:', /^\d+[.,]?\s*\*{0,3}\s*[a-zA-Z]/.test(text));
