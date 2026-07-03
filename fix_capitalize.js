/**
 * 综合修复脚本
 * 1. 修复专有名词大写
 * 2. 修复单词本身应大写
 */

const fs = require('fs');
const words = JSON.parse(fs.readFileSync('E:\\Tina\\自研背单词软件\\words.json', 'utf-8'));

// 专有名词列表
const properNouns = {
  'africa': 'Africa', 'america': 'America', 'american': 'American',
  'april': 'April', 'asia': 'Asia', 'august': 'August',
  'australia': 'Australia', 'australian': 'Australian',
  'britain': 'Britain', 'british': 'British',
  'canada': 'Canada', 'canadian': 'Canadian',
  'china': 'China', 'chinese': 'Chinese',
  'christmas': 'Christmas', 'december': 'December',
  'england': 'England', 'english': 'English', 'europe': 'Europe',
  'february': 'February', 'france': 'France', 'french': 'French',
  'friday': 'Friday', 'german': 'German', 'germany': 'Germany',
  'italian': 'Italian', 'italy': 'Italy',
  'january': 'January', 'japanese': 'Japanese',
  'july': 'July', 'june': 'June', 'march': 'March', 'may': 'May',
  'monday': 'Monday', 'november': 'November', 'october': 'October',
  'saturday': 'Saturday', 'september': 'September', 'sunday': 'Sunday',
  'thursday': 'Thursday', 'tuesday': 'Tuesday', 'wednesday': 'Wednesday',
};

let fixed = 0;

for (const w of words) {
  const wordLower = w.word.toLowerCase();
  
  // 1. 单词本身大写
  if (properNouns[wordLower] && w.word !== properNouns[wordLower]) {
    const newWord = properNouns[wordLower];
    console.log(`[单词大写] ${w.word} → ${newWord}`);
    w.word = newWord;
    fixed++;
  }
  
  // 2. 搭配中修复
  if (w.collocations) {
    for (let i = 0; i < w.collocations.length; i++) {
      let coll = w.collocations[i];
      if (typeof coll !== 'string') continue;
      
      let changed = false;
      // 修复专有名词
      for (const [lower, proper] of Object.entries(properNouns)) {
        const regex = new RegExp('\\b' + lower + '\\b', 'gi');
        if (regex.test(coll)) {
          // 只在非句首位置大写（句首位置已经是大写）
          // 用单词边界判断
          const newColl = coll.replace(regex, (match, offset) => {
            // 句首位置保持原样
            if (offset === 0) return match;
            // "I" 特殊处理
            if (lower === 'i') return 'I';
            return proper;
          });
          if (newColl !== coll) {
            coll = newColl;
            changed = true;
          }
        }
      }
      // 修复 "i" → "I" (在非句首位置)
      const newColl = coll.replace(/\bi\b/g, (match, offset) => {
        if (offset === 0) return match; // 句首不处理
        return 'I';
      });
      if (newColl !== coll) {
        coll = newColl;
        changed = true;
      }
      // 修复 "i'm" → "I'm"
      const newColl2 = coll.replace(/\bi'm\b/g, (match, offset) => {
        return "I'm";
      });
      if (newColl2 !== coll) {
        coll = newColl2;
        changed = true;
      }
      
      if (changed) {
        w.collocations[i] = coll;
        fixed++;
      }
    }
  }
  
  // 3. 例句中修复
  if (w.examples) {
    for (let i = 0; i < w.examples.length; i++) {
      let ex = w.examples[i];
      if (typeof ex !== 'string') continue;
      
      let changed = false;
      const origEx = ex;
      
      // 修复专有名词
      for (const [lower, proper] of Object.entries(properNouns)) {
        const regex = new RegExp('\\b' + lower + '\\b', 'gi');
        if (regex.test(ex)) {
          ex = ex.replace(regex, (match, offset) => {
            if (offset === 0) return match;
            if (lower === 'i') return 'I';
            return proper;
          });
          changed = true;
        }
      }
      // 修复 "i" → "I" (在非句首位置)
      const newEx = ex.replace(/\bi\b/g, (match, offset) => {
        if (offset === 0) return match;
        return 'I';
      });
      if (newEx !== ex) {
        ex = newEx;
        changed = true;
      }
      // 修复 "i'm" → "I'm"
      const newEx2 = ex.replace(/\bi'm\b/g, "I'm");
      if (newEx2 !== ex) {
        ex = newEx2;
        changed = true;
      }
      
      if (changed) {
        w.examples[i] = ex;
        console.log(`[例句] [${w.word}] ex[${i}]: ${origEx.substring(0, 60)}... → ${ex.substring(0, 80)}...`);
        fixed++;
      }
    }
  }
  
  // 4. 变形中修复
  if (w.forms) {
    for (let i = 0; i < w.forms.length; i++) {
      let form = w.forms[i];
      if (typeof form !== 'string') continue;
      
      let changed = false;
      for (const [lower, proper] of Object.entries(properNouns)) {
        const regex = new RegExp('\\b' + lower + '\\b', 'gi');
        if (regex.test(form)) {
          form = form.replace(regex, (match, offset) => {
            if (offset === 0) return match;
            if (lower === 'i') return 'I';
            return proper;
          });
          changed = true;
        }
      }
      
      if (changed) {
        w.forms[i] = form;
        fixed++;
      }
    }
  }
}

fs.writeFileSync('E:\\Tina\\自研背单词软件\\words.json', JSON.stringify(words, null, 2), 'utf-8');
console.log(`\n总共修复: ${fixed} 处`);
