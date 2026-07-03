const fs = require('fs');
const tinaContents = fs.readdirSync('E:\\Tina');
let projectFolder = null;
for (const dir of tinaContents) {
  try {
    const sub = fs.readdirSync('E:\\Tina\\' + dir);
    if (sub.includes('final_words.json')) { projectFolder = dir; break; }
  } catch(e){}
}
const basePath = 'E:\\Tina\\' + projectFolder;

const defs3 = {
  'duck': '鸭子', 'dull': '无聊的；钝的', 'eager': '渴望的',
  'educational': '教育的', 'effective': '有效的', 'elder': '长辈；年长的',
  'elementary': '初级的', 'elephant': '大象', 'embarrassed': '尴尬的',
  'enable': '使能够', 'enrich': '丰富', 'entertainment': '娱乐',
  'entrance': '入口', 'equal': '相等的', 'everyday': '日常的',
  'exactly': '确切地', 'exchange': '交换', 'exist': '存在',
  'exit': '出口', 'fable': '寓言', 'familiar': '熟悉的',
  'fan': '粉丝；风扇', 'fare': '车费', 'farmer': '农民',
  'fashion': '时尚', 'fasten': '系紧', 'favour': '恩惠；好感',
  'female': '女性的', 'fence': '栅栏', 'ferry': '渡轮',
  'figure': '数字；身材', 'firework': '烟花', 'flag': '旗帜',
  'flash': '闪光', 'flexible': '灵活的', 'flood': '洪水',
  'flu': '流感', 'fond': '喜欢的', 'foolish': '愚蠢的',
  'forecast': '预报', 'foreigner': '外国人', 'forgetful': '健忘的',
  'forgive': '原谅', 'fork': '叉子', 'forward': '向前',
  'fountain': '喷泉', 'france': '法国', 'friday': '星期五',
  'friendship': '友谊', 'frighten': '吓唬', 'frightened': '害怕的',
  'frightening': '令人害怕的', 'further': '更远的', 'gain': '获得',
  'generation': '一代人', 'generous': '慷慨的', 'gentle': '温柔的',
  'geography': '地理', 'germany': '德国', 'grandma': '奶奶',
  'grandpa': '爷爷', 'grape': '葡萄', 'greenhouse': '温室',
  'greet': '问候', 'happily': '快乐地', 'happiness': '幸福',
  'harm': '伤害', 'headline': '头条新闻', 'headmaster': '校长',
  'heavily': '大量地', 'hello': '你好', 'hesitate': '犹豫',
  'hometown': '家乡', 'honour': '荣誉', 'hopeful': '有希望的',
  'hopeless': '无望的', 'horrible': '可怕的', 'hot-dog': '热狗',
  'hunt': '打猎', 'ice-cream': '冰淇淋', 'ignore': '忽视',
  'illness': '疾病', 'industry': '工业', 'ink': '墨水',
  'inventor': '发明家', 'investigate': '调查', 'italian': '意大利的；意大利人',
  'italy': '意大利', 'japanese': '日语；日本人', 'keen': '热心的',
  'kilogram': '千克', 'kindergarten': '幼儿园', 'lantern': '灯笼',
  'lend': '借出', 'length': '长度', 'level': '水平',
  'limit': '限制', 'limited': '有限的', 'link': '链接',
  'liquid': '液体', 'litter': '垃圾', 'locate': '位于',
  'location': '位置', 'london': '伦敦', 'lost': '丢失的',
  'lovely': '可爱的', 'luckily': '幸运地', 'luggage': '行李',
  'mad': '生气的', 'madam': '夫人', 'mainly': '主要地',
  'major': '主要的', 'male': '男性的', 'manager': '经理',
  'material': '材料', 'maths': '数学', 'meaning': '意思',
  'medium': '中等的', 'meeting': '会议', 'mention': '提及',
  'mess': '混乱', 'metre': '米', 'mix': '混合',
  'mixture': '混合物', 'monitor': '班长；显示器', 'mood': '心情',
  'motorcycle': '摩托车', 'mum': '妈妈', 'mushroom': '蘑菇',
  'narrow': '窄的', 'nation': '国家', 'nationality': '国籍',
  'native': '本地的', 'nature': '自然', 'nearby': '附近的',
  'neck': '脖子', 'neighbour': '邻居', 'neither': '两者都不',
  'network': '网络', 'noisy': '吵闹的', 'novel': '小说',
  'nowhere': '任何地方都不', 'obey': '遵守', 'observe': '观察',
  'occupation': '职业', 'officer': '官员', 'onto': '到……上',
  'operation': '手术；操作', 'ordinary': '普通的', 'organization': '组织',
  'ought': '应该', 'outing': '出游', 'oven': '烤箱',
  'owner': '主人', 'pacific': '太平洋的', 'painting': '画作',
  'pale': '苍白的', 'panda': '熊猫', 'pardon': '原谅',
  'passenger': '乘客', 'passport': '护照', 'pearl': '珍珠',
  'per': '每', 'percent': '百分之', 'physical': '身体的',
  'physics': '物理', 'pill': '药丸', 'pineapple': '菠萝',
  'pink': '粉色的', 'planet': '行星', 'plastic': '塑料',
  'platform': '站台', 'playground': '操场', 'pleasant': '愉快的',
  'plenty': '大量', 'pole': '杆', 'pound': '磅',
  'power': '力量', 'powerful': '强大的', 'praise': '赞扬',
  'precious': '珍贵的', 'prevent': '预防', 'probable': '可能的',
  'pronounce': '发音', 'proverb': '谚语', 'rather': '相当',
  'recently': '最近', 'recycle': '回收', 'refer': '参考',
  'reference': '参考', 'regard': '认为', 'relax': '放松',
  'release': '释放', 'remind': '提醒', 'respect': '尊重',
  'reward': '奖励', 'rocket': '火箭', 'rose': '玫瑰',
  'rude': '粗鲁的', 'salty': '咸的', 'schedule': '日程',
  'seed': '种子', 'serve': '服务', 'settle': '解决；安顿',
  'signal': '信号', 'silk': '丝绸', 'social': '社会的',
  'solution': '解决方案', 'somebody': '某人', 'state': '状态；州',
  'stomachache': '胃痛', 'storm': '暴风雨', 'style': '风格',
  'surprised': '惊讶的', 'talent': '天赋', 'tear': '眼泪；撕裂',
  'teenager': '青少年', 'television': '电视', 'temple': '寺庙',
  'thought': '想法', 'thus': '因此', 'tip': '提示；小费',
  'transportation': '交通', 'truck': '卡车', 'underline': '下划线',
  'underlined': '画下划线的', 'variety': '多样性', 'volunteer': '志愿者',
  'waitress': '女服务员', 'weak': '虚弱的', 'weaken': '削弱',
  'web': '网络', 'website': '网站', 'weigh': '称重',
  'wet': '湿的', 'whom': '谁（宾格）', 'within': '在……内',
  'wooden': '木制的', 'ery': '非常（very的变体）',
  'reck': '注意；顾及', 'thicken': '变厚', 'to': '到'
};

const words = JSON.parse(fs.readFileSync(basePath + '\\final_words.json', 'utf8'));
let updated = 0;
for (const w of words) {
  if (!w.definition || w.definition.length === 0) {
    const key = w.word.toLowerCase().trim();
    if (defs3[key]) { w.definition = defs3[key]; updated++; }
  }
}
fs.writeFileSync(basePath + '\\final_words.json', JSON.stringify(words, null, 2), 'utf8');

const appWords = JSON.parse(fs.readFileSync(basePath + '\\words.json', 'utf8'));
const appMap = new Map();
for (const w of appWords) appMap.set(w.word.toLowerCase().trim(), w);
let appUpdated = 0;
for (const w of words) {
  const key = w.word.toLowerCase().trim();
  const appWord = appMap.get(key);
  if (appWord && (!appWord.meaning || appWord.meaning.length === 0) && w.definition) {
    appWord.meaning = w.definition; appUpdated++;
  }
}
fs.writeFileSync(basePath + '\\words.json', JSON.stringify(appWords, null, 2), 'utf8');

console.log(`Updated ${updated} in final_words.json, ${appUpdated} in words.json`);
const stillNoDef = words.filter(w => !w.definition || w.definition.length === 0);
console.log(`Still missing: ${stillNoDef.length}`);
if (stillNoDef.length > 0) console.log('Missing:', stillNoDef.map(w => w.word).join(', '));
const withDef = words.filter(w => w.definition && w.definition.length > 0).length;
console.log(`Final: ${withDef}/${words.length} have definitions (${(withDef/words.length*100).toFixed(1)}%)`);
