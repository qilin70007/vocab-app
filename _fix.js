const fs = require('fs');
const data = JSON.parse(fs.readFileSync('words.json', 'utf8'));

// Check structure
const keys = Object.keys(data);
console.log('Top-level keys:', keys);
if (data.words) {
  console.log('Words is array:', Array.isArray(data.words), 'Length:', data.words.length);
  console.log('First word:', JSON.stringify(data.words[0]));
} else if (Array.isArray(data)) {
  console.log('Root is array, length:', data.length);
  console.log('First:', JSON.stringify(data[0]));
} else {
  // Maybe words are direct properties
  console.log('Type of data:', typeof data);
  console.log('First few keys:', keys.slice(0, 10));
}
