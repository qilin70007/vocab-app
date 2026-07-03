const fs = require('fs');
const data = require('../words.json');

// 113个缺失释义的词的补充数据
const supplements = {
  'accurate': { phonetic: '[ˈækjərət]', pos: 'adj.', meaning: '精确的；准确的' },
  'ache': { phonetic: '[eɪk]', pos: 'n./v.', meaning: '疼痛' },
  'adventure': { phonetic: '[ədˈventʃə(r)]', pos: 'n.', meaning: '冒险；奇遇' },
  'advertisement': { phonetic: '[ədˈvɜːtɪsmənt]', pos: 'n.', meaning: '广告' },
  'affect': { phonetic: '[əˈfekt]', pos: 'v.', meaning: '影响；感动' },
  'aged': { phonetic: '[eɪdʒd]', pos: 'adj.', meaning: '年迈的；…岁的' },
  'ou': { phonetic: '', pos: '', meaning: '', fix: 'out' },  // OCR错误，应该是out
  'ancient': { phonetic: '[ˈeɪnʃənt]', pos: 'adj.', meaning: '古代的；古老的' },
  'angrily': { phonetic: '[ˈæŋɡrəli]', pos: 'adv.', meaning: '愤怒地' },
  'apologize': { phonetic: '[əˈpɒlədʒaɪz]', pos: 'v.', meaning: '道歉' },
  'arrival': { phonetic: '[əˈraɪvl]', pos: 'n.', meaning: '到达；到来' },
  'assistant': { phonetic: '[əˈsɪstənt]', pos: 'n.', meaning: '助手；助理' },
  'attack': { phonetic: '[əˈtæk]', pos: 'n./v.', meaning: '攻击；进攻' },
  'attitude': { phonetic: '[ˈætɪtjuːd]', pos: 'n.', meaning: '态度；看法' },
  'attract': { phonetic: '[əˈtrækt]', pos: 'v.', meaning: '吸引；引起' },
  'average': { phonetic: '[ˈævərɪdʒ]', pos: 'adj./n.', meaning: '平均的；平均水平' },
  'bar': { phonetic: '[bɑː(r)]', pos: 'n.', meaning: '条；棒；酒吧' },
  'britain': { phonetic: '[ˈbrɪtn]', pos: 'n.', meaning: '英国' },
  'briton': { phonetic: '[ˈbrɪtn]', pos: 'n.', meaning: '英国人' },
  'channel': { phonetic: '[ˈtʃænl]', pos: 'n.', meaning: '频道；海峡；渠道' },
  'click': { phonetic: '[klɪk]', pos: 'v./n.', meaning: '点击' },
  'cousin': { phonetic: '[ˈkʌzn]', pos: 'n.', meaning: '堂兄弟姊妹；表兄弟姊妹' },
  'cream': { phonetic: '[kriːm]', pos: 'n.', meaning: '奶油；乳脂' },
  'date': { phonetic: '[deɪt]', pos: 'n.', meaning: '日期；约会' },
  'day': { phonetic: '[deɪ]', pos: 'n.', meaning: '天；日子' },
  'death': { phonetic: '[deθ]', pos: 'n.', meaning: '死亡' },
  'debate': { phonetic: '[dɪˈbeɪt]', pos: 'n./v.', meaning: '辩论；讨论' },
  'tay': { phonetic: '', pos: '', meaning: '', fix: 'day' },  // OCR错误
  'rarsat': { phonetic: '', pos: '', meaning: '', fix: 'rarely' },  // OCR错误
  'diet': { phonetic: '[ˈdaɪət]', pos: 'n.', meaning: '饮食；日常食物' },
  'difficulty': { phonetic: '[ˈdɪfɪkəlti]', pos: 'n.', meaning: '困难；难题' },
  'dinner': { phonetic: '[ˈdɪnə(r)]', pos: 'n.', meaning: '正餐；晚餐' },
  'directly': { phonetic: '[dəˈrektli]', pos: 'adv.', meaning: '直接地；径直地' },
  'director': { phonetic: '[dəˈrektə(r)]', pos: 'n.', meaning: '导演；主任；董事' },
  'discussion': { phonetic: '[dɪˈskʌʃn]', pos: 'n.', meaning: '讨论；商讨' },
  'the': { phonetic: '[ðə]', pos: 'art.', meaning: '这；那（定冠词）' },
  'collocation': { phonetic: '[ˌkɒləˈkeɪʃn]', pos: 'n.', meaning: '搭配；组合' },
  'each': { phonetic: '[iːtʃ]', pos: 'adj./pron.', meaning: '每个；各自的' },
  'early': { phonetic: '[ˈɜːli]', pos: 'adj./adv.', meaning: '早的；提早' },
  'egg': { phonetic: '[eɡ]', pos: 'n.', meaning: '蛋；卵' },
  'electric': { phonetic: '[ɪˈlektrɪk]', pos: 'adj.', meaning: '电的；电动的' },
  'electricity': { phonetic: '[ɪˌlekˈtrɪsəti]', pos: 'n.', meaning: '电；电力' },
  'e-mail': { phonetic: '[ˈiːmeɪl]', pos: 'n./v.', meaning: '电子邮件' },
  'engine': { phonetic: '[ˈendʒɪn]', pos: 'n.', meaning: '发动机；引擎' },
  'escape': { phonetic: '[ɪˈskeɪp]', pos: 'v./n.', meaning: '逃跑；逃脱' },
  'eve': { phonetic: '[iːv]', pos: 'n.', meaning: '前夕；前夜' },
  'even': { phonetic: '[ˈiːvn]', pos: 'adv.', meaning: '甚至；即使' },
  'examine': { phonetic: '[ɪɡˈzæmɪn]', pos: 'v.', meaning: '检查；考试' },
  'excited': { phonetic: '[ɪkˈsaɪtɪd]', pos: 'adj.', meaning: '兴奋的；激动的' },
  'exercise': { phonetic: '[ˈeksəsaɪz]', pos: 'n./v.', meaning: '锻炼；练习' },
  'explore': { phonetic: '[ɪkˈsplɔː(r)]', pos: 'v.', meaning: '探索；探险' },
  'eye': { phonetic: '[aɪ]', pos: 'n.', meaning: '眼睛' },
  'fail': { phonetic: '[feɪl]', pos: 'v.', meaning: '失败；不及格' },
  'february': { phonetic: '[ˈfebruəri]', pos: 'n.', meaning: '二月' },
  'fix': { phonetic: '[fɪks]', pos: 'v.', meaning: '修理；固定' },
  'following': { phonetic: '[ˈfɒləʊɪŋ]', pos: 'adj.', meaning: '接下来的；下列的' },
  'fool': { phonetic: '[fuːl]', pos: 'n./v.', meaning: '傻瓜；愚弄' },
  'form': { phonetic: '[fɔːm]', pos: 'n./v.', meaning: '形式；表格；形成' },
  'freedom': { phonetic: '[ˈfriːdəm]', pos: 'n.', meaning: '自由' },
  'freezing': { phonetic: '[ˈfriːzɪŋ]', pos: 'adj.', meaning: '极冷的；冰冻的' },
  'fridge': { phonetic: '[frɪdʒ]', pos: 'n.', meaning: '冰箱' },
  'fried': { phonetic: '[fraɪd]', pos: 'adj.', meaning: '油炸的' },
  'frozen': { phonetic: '[ˈfrəʊzn]', pos: 'adj.', meaning: '冰冻的；冷冻的' },
  'fruit': { phonetic: '[fruːt]', pos: 'n.', meaning: '水果' },
  'funny': { phonetic: '[ˈfʌni]', pos: 'adj.', meaning: '有趣的；滑稽的' },
  'furniture': { phonetic: '[ˈfɜːnɪtʃə(r)]', pos: 'n.', meaning: '家具' },
  'gas': { phonetic: '[ɡæs]', pos: 'n.', meaning: '气体；汽油' },
  'general': { phonetic: '[ˈdʒenrəl]', pos: 'adj./n.', meaning: '一般的；总的；将军' },
  'gently': { phonetic: '[ˈdʒentli]', pos: 'adv.', meaning: '温柔地；轻轻地' },
  'glad': { phonetic: '[ɡlæd]', pos: 'adj.', meaning: '高兴的；乐意的' },
  'honesty': { phonetic: '[ˈɒnəsti]', pos: 'n.', meaning: '诚实；正直' },
  'including': { phonetic: '[ɪnˈkluːdɪŋ]', pos: 'prep.', meaning: '包括' },
  'increase': { phonetic: '[ɪnˈkriːs]', pos: 'v./n.', meaning: '增加；增长' },
  'invention': { phonetic: '[ɪnˈvenʃn]', pos: 'n.', meaning: '发明；创造' },
  'infer': { phonetic: '[ɪnˈfɜː(r)]', pos: 'v.', meaning: '推断；推论' },
  'jeans': { phonetic: '[dʒiːnz]', pos: 'n.', meaning: '牛仔裤' },
  'journalist': { phonetic: '[ˈdʒɜːnəlɪst]', pos: 'n.', meaning: '记者；新闻工作者' },
  'judge': { phonetic: '[dʒʌdʒ]', pos: 'n./v.', meaning: '法官；判断；评判' },
  'junior': { phonetic: '[ˈdʒuːniə(r)]', pos: 'adj.', meaning: '初级的；年少的' },
  'kilometre': { phonetic: '[ˈkɪləmiːtə(r)]', pos: 'n.', meaning: '千米；公里' },
  'kindness': { phonetic: '[ˈkaɪndnəs]', pos: 'n.', meaning: '善良；好意' },
  'large': { phonetic: '[lɑːdʒ]', pos: 'adj.', meaning: '大的；巨大的' },
  'later': { phonetic: '[ˈleɪtə(r)]', pos: 'adv.', meaning: '后来；稍后' },
  'lawyer': { phonetic: '[ˈlɔːjə(r)]', pos: 'n.', meaning: '律师' },
  'librarian': { phonetic: '[laɪˈbreəriən]', pos: 'n.', meaning: '图书管理员' },
  'likely': { phonetic: '[ˈlaɪkli]', pos: 'adj./adv.', meaning: '可能的；或许' },
  'loud': { phonetic: '[laʊd]', pos: 'adj.', meaning: '大声的；响亮的' },
  'lucky': { phonetic: '[ˈlʌki]', pos: 'adj.', meaning: '幸运的' },
  'market': { phonetic: '[ˈmɑːkɪt]', pos: 'n.', meaning: '市场；集市' },
  'mother': { phonetic: '[ˈmʌðə(r)]', pos: 'n.', meaning: '母亲' },
  'mr': { phonetic: '[ˈmɪstə(r)]', pos: 'n.', meaning: '先生（用于称呼）' },
  'naughty': { phonetic: '[ˈnɔːti]', pos: 'adj.', meaning: '淘气的；调皮的' },
  'nearly': { phonetic: '[ˈnɪəli]', pos: 'adv.', meaning: '几乎；将近' },
  'necessary': { phonetic: '[ˈnesəsəri]', pos: 'adj.', meaning: '必要的；必需的' },
  'neighbourhood': { phonetic: '[ˈneɪbəhʊd]', pos: 'n.', meaning: '街区；邻里' },
  'nose': { phonetic: '[nəʊz]', pos: 'n.', meaning: '鼻子' },
  'nowadays': { phonetic: '[ˈnaʊədeɪz]', pos: 'adv.', meaning: '现今；现在' },
  'official': { phonetic: '[əˈfɪʃl]', pos: 'adj./n.', meaning: '官方的；官员' },
  'oil': { phonetic: '[ɔɪl]', pos: 'n.', meaning: '油；石油' },
  'operate': { phonetic: '[ˈɒpəreɪt]', pos: 'v.', meaning: '操作；运转；动手术' },
  'opinion': { phonetic: '[əˈpɪnjən]', pos: 'n.', meaning: '意见；看法' },
  'partner': { phonetic: '[ˈpɑːtnə(r)]', pos: 'n.', meaning: '伙伴；搭档' },
  'past': { phonetic: '[pɑːst]', pos: 'adj./prep.', meaning: '过去的；经过' },
  'our': { phonetic: '[ˈaʊə(r)]', pos: 'pron.', meaning: '我们的' },
  'pleased': { phonetic: '[pliːzd]', pos: 'adj.', meaning: '高兴的；满意的' },
  'pot': { phonetic: '[pɒt]', pos: 'n.', meaning: '锅；罐；壶' },
  'quietly': { phonetic: '[ˈkwaɪətli]', pos: 'adv.', meaning: '安静地；悄悄地' },
  'satisfying': { phonetic: '[ˈsætɪsfaɪɪŋ]', pos: 'adj.', meaning: '令人满意的' },
  'suggestion': { phonetic: '[səˈdʒestʃən]', pos: 'n.', meaning: '建议；提议' },
  'support': { phonetic: '[səˈpɔːt]', pos: 'v./n.', meaning: '支持；支撑' },
  'upset': { phonetic: '[ʌpˈset]', pos: 'adj.', meaning: '心烦的；不安的' },
  'writer': { phonetic: '[ˈraɪtə(r)]', pos: 'n.', meaning: '作家；作者' },
  'yogurt': { phonetic: '[ˈjɒɡət]', pos: 'n.', meaning: '酸奶' },
};

let fixed = 0;
let spellingFixed = 0;

data.forEach(x => {
  if (!x.meaning || x.meaning.trim().length === 0) {
    const sup = supplements[x.word.toLowerCase()];
    if (sup) {
      if (sup.fix) {
        // OCR拼写错误，修正
        console.log(`修正拼写: ${x.word} → ${sup.fix}`);
        x.word = sup.fix;
        spellingFixed++;
        // 重新检查修正后的词是否在旧词库有释义
      }
      if (sup.meaning) {
        x.meaning = sup.meaning;
        x.phonetic = sup.phonetic;
        x.pos = sup.pos;
        fixed++;
      }
    }
  }
});

// 对于修正拼写后的词，再尝试从旧词库匹配
const oldWords = require('../words_backup_1908.json');
const oldMap = {};
oldWords.forEach(x => { oldMap[x.word.toLowerCase()] = x; });

data.forEach(x => {
  if (!x.meaning || x.meaning.trim().length === 0) {
    const oldItem = oldMap[x.word.toLowerCase()];
    if (oldItem) {
      x.meaning = oldItem.meaning || '';
      x.phonetic = oldItem.phonetic || '';
      x.pos = oldItem.pos || '';
      if (oldItem.examples) x.examples = oldItem.examples;
      if (oldItem.forms) x.forms = oldItem.forms.map(f => typeof f === 'string' ? f : (f.form + ' ' + (f.desc || '')));
      if (oldItem.collocations) x.collocations = oldItem.collocations.filter(c => c.eng).map(c => c.eng);
      console.log(`从旧库补充: ${x.word}`);
      fixed++;
    }
  }
});

// 最终统计
let stillNoMeaning = data.filter(x => !x.meaning || x.meaning.trim().length === 0);
let noPhonetic = data.filter(x => !x.phonetic || x.phonetic.trim().length === 0);
let noExamples = data.filter(x => !x.examples || x.examples.length === 0);

console.log('---');
console.log('补充释义:', fixed, '个');
console.log('修正拼写:', spellingFixed, '个');
console.log('最终统计:');
console.log('  总词数:', data.length);
console.log('  无释义:', stillNoMeaning.length);
console.log('  无音标:', noPhonetic.length);
console.log('  无例句:', noExamples.length);
if (stillNoMeaning.length > 0) {
  console.log('  仍无释义:', stillNoMeaning.map(x => x.word).join(', '));
}

fs.writeFileSync('../words.json', JSON.stringify(data, null, 2), 'utf8');
console.log('已写入: words.json');
