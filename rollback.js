/**
 * 回滚 words.json - 从备份恢复
 */

const fs = require('fs');

// 检查是否有备份
const BACKUP = 'E:\\Tina\\自研背单词软件\\words_backup.json';
const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';

try {
  const backup = fs.readFileSync(BACKUP, 'utf-8');
  fs.writeFileSync(WORDS_PATH, backup, 'utf-8');
  console.log('已从备份恢复 words.json');
} catch (e) {
  console.log('没有找到备份文件，无法回滚');
  console.log('错误:', e.message);
}
