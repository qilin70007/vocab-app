// Debug more lines
const lines = [
  "== P 26. advise /ad'vaiz/ v. WE, BE, BW",
  "> 31. 'after /'a:fto(r)/ prep. TE ZA; TE Ja",
];

function stripPrefix(line) {
  let text = line.replace(/^(?:=\w*\s*)?>\s*/, '');
  text = text.replace(/^[=\w]+\s+>\s*/, '');
  text = text.replace(/^>\s*/, '');
  text = text.replace(/^[=\w]+\s+/, '');
  return text;
}

for (const line of lines) {
  const text = stripPrefix(line);
  const match = /^\d+[.,]?\s*\*{0,3}\s*['a-zA-Z]/.test(text);
  console.log(match ? 'MATCH' : 'NO', '| stripped:', JSON.stringify(text));
}

// The problem: "== P 26. advise"
// After step1 (=\w*\s*>): no match, stays "== P 26. advise..."
// After step2 ([=\w]+\s+>\s*): no match (no >), stays same
// After step3 (>): no match
// After step4 ([=\w]+\s+): matches "== P " -> "26. advise..."
// Then /^\d+/ should match "26."

// Let's trace step by step
const line = "== P 26. advise /ad'vaiz/ v. WE, BE, BW";
let t = line;
console.log('\n--- Trace for:', line);
t = t.replace(/^(?:=\w*\s*)?>\s*/, '');
console.log('step1:', JSON.stringify(t));
t = t.replace(/^[=\w]+\s+>\s*/, '');
console.log('step2:', JSON.stringify(t));
t = t.replace(/^>\s*/, '');
console.log('step3:', JSON.stringify(t));
t = t.replace(/^[=\w]+\s+/, '');
console.log('step4:', JSON.stringify(t));
console.log('match:', /^\d+[.,]?\s*\*{0,3}\s*['a-zA-Z]/.test(t));
