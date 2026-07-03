// Debug: test word cleaning
const w = "'after";
const c = w.replace(/^[^a-zA-Z]+/, '').replace(/[^a-zA-Z\-'\s]/g, '').trim();
console.log('original:', JSON.stringify(w));
console.log('cleaned:', JSON.stringify(c));
console.log('valid:', /^[a-zA-Z][a-zA-Z\-'\s]*$/.test(c));

// Also test the actual line parsing
const line = "> 31. 'after /'a:fto(r)/ prep. TE ZA; TE Ja";
let text = line.replace(/^(?:=\w*\s*)?>\s*/, '').replace(/^[=\w]+\s+>\s*/, '').replace(/^>\s*/, '').replace(/^[=\w]+\s+/, '');
console.log('\nline after prefix strip:', JSON.stringify(text));

const numMatch = text.match(/^(\d+)[.,]?\s*/);
console.log('numMatch:', numMatch ? numMatch[0] : 'null');
if (numMatch) {
  text = text.substring(numMatch[0].length);
  console.log('after num:', JSON.stringify(text));
}

const starMatch = text.match(/^(\*{0,3})\s*/);
if (starMatch) {
  text = text.substring(starMatch[0].length);
  console.log('after star:', JSON.stringify(text));
}

const phonMatch = text.match(/^(\S+)\s+\/([^\/]+)\/\s*/);
console.log('phonMatch:', phonMatch ? {
  word: phonMatch[1],
  phonetic: phonMatch[2],
  remaining: text.substring(phonMatch[0].length)
} : 'null');

if (phonMatch) {
  let word = phonMatch[1];
  console.log('word before clean:', JSON.stringify(word));
  word = word.replace(/^[^a-zA-Z]+/, '').replace(/[^a-zA-Z\-'\s]/g, '').trim();
  console.log('word after clean:', JSON.stringify(word));
  console.log('word valid:', /^[a-zA-Z][a-zA-Z\-'\s]*$/.test(word));
}
