// 从 raw_vocab_text.txt 提取每个单词的例句，与 words.json 对比
const fs = require('fs');

const rawBytes = fs.readFileSync('E:/Tina/自研背单词软件/raw_vocab_text.txt');
const rawText = rawBytes.toString('utf-8');

// 解析 raw_vocab_text.txt：格式是 "word [...] n. 词性 词义\n例句英文\n例句中文"
// 但格式不固定，需要启发式解析
// 找到所有 "英文例句.\n中文翻译。" 模式
const lines = rawText.split('\n');
const wordExamples = {}; // word -> [exampleEnglish]
let currentWord = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // 匹配词条行: word[phonetic] pos. meaning
  const wordMatch = line.match(/^([a-zA-Z][a-zA-Z\s'-]*)\s*\[/);
  if (wordMatch && !line.match(/^(The|A|It|This|That|He|She|We|They|I|You|There|Here|What|How|Why|When|Where|Who|Which|Is|Are|Was|Were|Do|Does|Did|Can|Could|Should|Would|Will|Have|Has|Had|Let|Don't|Let's|In|On|At|By|For|To|Of|With|From|About|As|If|But|And|Or|So|Because|Although|Though|When|While|Before|After|Until|Since|Unless)/)) {
    // This might be a word entry
    const word = wordMatch[1].trim().toLowerCase();
    if (word.length > 0 && word.length < 30) {
      currentWord = word;
    }
  }
  
  // 匹配英文例句行：以大写字母开头，以句号/感叹号/问号结尾，下一行是中文
  if (currentWord && line.match(/^[A-Z]/) && line.match(/[.!?]$/) && line.length > 15) {
    // Check next line is Chinese
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (nextLine.match(/[\u4e00-\u9fff]/)) {
        if (!wordExamples[currentWord]) wordExamples[currentWord] = [];
        wordExamples[currentWord].push(line);
      }
    }
  }
}

// 加载 words.json
const words = JSON.parse(fs.readFileSync('E:/Tina/自研背单词软件/words.json', 'utf-8'));

let matched = 0, mismatched = 0, onlyInRaw = 0, onlyInWords = 0;
const mismatches = [];

for (const w of words) {
  const word = w.word.toLowerCase();
  const rawEx = wordExamples[word];
  const jsonEx = (w.examples || []).map(ex => {
    // Extract English part before Chinese
    const m = ex.match(/^([^.!?]*[.!?])/);
    return m ? m[1].trim() : ex;
  });
  
  if (rawEx && rawEx.length > 0) {
    if (jsonEx && jsonEx.length > 0) {
      // Compare
      let found = false;
      for (const re of rawEx) {
        for (const je of jsonEx) {
          if (re.toLowerCase() === je.toLowerCase()) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (found) {
        matched++;
      } else {
        mismatched++;
        mismatches.push({
          word: w.word,
          number: w.number,
          rawExamples: rawEx,
          jsonExamples: jsonEx
        });
      }
    } else {
      onlyInRaw++;
      mismatches.push({
        word: w.word,
        number: w.number,
        rawExamples: rawEx,
        jsonExamples: []
      });
    }
  } else if (jsonEx && jsonEx.length > 0) {
    onlyInWords++;
  }
}

console.log('=== 对比结果 ===');
console.log('raw_vocab_text 中有例句的词条数:', Object.keys(wordExamples).length);
console.log('完全匹配:', matched);
console.log('不一致:', mismatched);
console.log('仅 raw 有例句:', onlyInRaw);
console.log('仅 words.json 有例句:', onlyInWords);
console.log('');
console.log('=== 不一致详情 (前50个) ===');
for (const m of mismatches.slice(0, 50)) {
  console.log(`\n#${m.number} ${m.word}`);
  console.log('  PDF原文:', m.rawExamples.join(' | '));
  console.log('  软件中:', (m.jsonExamples.length > 0 ? m.jsonExamples.join(' | ') : '(无例句)'));
}

// 保存完整结果
fs.writeFileSync('E:/Tina/自研背单词软件/compare_result.json', JSON.stringify(mismatches, null, 2), 'utf-8');
console.log('\n完整结果已保存到 compare_result.json，共', mismatches.length, '条不一致');
