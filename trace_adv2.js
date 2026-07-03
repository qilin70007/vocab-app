// Check words_merged_v8.json (1908 entries) - does it have adventure?
const fs = require('fs');
const files = ['words_merged_v8.json', 'words_merged_v7.json', 'words_merged_v6.json', 'words_backup_1908.json'];
for (const fn of files) {
    try {
        const data = JSON.parse(fs.readFileSync(`E:/Tina/自研背单词软件/${fn}`, 'utf8'));
        const adv = data.find(w => w && w.word && w.word.toLowerCase() === 'adventure');
        if (adv) {
            console.log(`${fn}: adventure found, examples: ${JSON.stringify(adv.examples || [])}`);
        } else {
            console.log(`${fn}: adventure NOT found (${data.length} entries)`);
        }
    } catch(e) {
        console.log(`${fn}: ERROR ${e.message}`);
    }
}
