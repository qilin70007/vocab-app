const fs = require('fs');

const tinaContents = fs.readdirSync('E:\\Tina');

for (const dir of tinaContents) {
  try {
    const subContents = fs.readdirSync('E:\\Tina\\' + dir);
    const hasData = subContents.some(s => s.toLowerCase() === 'data');
    if (hasData) {
      console.log('Folder with data:', dir);
      console.log('  Contents:', subContents.slice(0, 10).join(', '));
      const dataContents = fs.readdirSync('E:\\Tina\\' + dir + '\\data');
      console.log('  Data contents:', dataContents.join(', '));
    }
  } catch(e) {
    // skip
  }
}
