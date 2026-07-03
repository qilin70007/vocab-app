// Fix corrupted forms in words.json - comprehensive approach
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('E:\\Tina\\自研背单词软件\\words.json', 'utf8'));

const changes = [];

// For each word, define what its correct forms should be
// Keyed by word number. Each value is the complete replacement forms array.
const wordFixes = new Map();

// === A section ===
wordFixes.set(11, ["cross v."]);                    // across
wordFixes.set(22, ["disadvantage n."]);             // advantage (remove "advertise" - wrong)
wordFixes.set(35, ["agency n.", "agent n."]);       // age
wordFixes.set(64, ["amuse v."]);                    // amusing
wordFixes.set(66, ["angry adj."]);                  // and -> angrily -> angry
wordFixes.set(79, ["applicable adj."]);             // apply
wordFixes.set(82, ["argument n."]);                 // argue
wordFixes.set(86, ["arrangement n."]);              // arrange
wordFixes.set(90, []);                              // article - phrase, not form
wordFixes.set(94, []);                              // ask - assist not a form
wordFixes.set(106, ["Australian adj."]);            // Australia
wordFixes.set(110, ["availability n."]);            // available
wordFixes.set(113, []);                             // award - awfully not a form
wordFixes.set(117, ["background n."]);              // back
wordFixes.set(119, ["badly adv."]);                 // bad
wordFixes.set(120, []);                             // bag - balanced not a form of bag
wordFixes.set(121, ["baker n."]);                   // bakery
wordFixes.set(122, ["balanced adj."]);              // balance
wordFixes.set(123, []);                             // ball - phrase, not form
wordFixes.set(129, ["base n.", "basically adv.", "basis n."]); // basic
wordFixes.set(138, []);                             // bear - beautifully/beauty not forms; proper: born/borne
wordFixes.set(140, ["beautifully adv.", "beauty n."]); // beautiful
wordFixes.set(149, ["beggar n."]);                  // beg (remove "beginning" - not a form)
wordFixes.set(152, ["behave v."]);                  // behaviour
wordFixes.set(153, ["belief n."]);                  // behind (belief garbled)
wordFixes.set(155, ["believable adj.", "unbelievable adj.", "believably adv."]); // believe
wordFixes.set(169, []);                             // bird - phrase
wordFixes.set(175, ["board n."]);                   // blackboard
wordFixes.set(178, []);                             // block - garbled
wordFixes.set(185, []);                             // boil - garbled
wordFixes.set(187, ["boring adj."]);                // bored
wordFixes.set(192, []);                             // both - garbled
wordFixes.set(199, ["bravely adv."]);               // brave
wordFixes.set(200, []);                             // bread - garbled "cerus"
wordFixes.set(203, ["breathe v."]);                 // breath
wordFixes.set(206, ["brightly adv.", "brightness n."]); // bright (British was wrong)
wordFixes.set(207, []);                             // bring - phrase
wordFixes.set(215, ["building n.", "rebuild v."]);  // build
wordFixes.set(216, []);                             // building - "bund" unrelated
wordFixes.set(219, []);                             // bus - all 3 forms wrong
wordFixes.set(222, ["business n."]);                // busy
wordFixes.set(234, ["calmly adv."]);                // calm
wordFixes.set(238, ["Canadian adj."]);              // Canada
wordFixes.set(245, ["careful adj.", "careless adj."]); // care
wordFixes.set(257, ["celebration n."]);             // celebrate
wordFixes.set(258, ["central adj."]);               // cent
wordFixes.set(259, ["central adj."]);               // centre
wordFixes.set(261, []);                             // certainly - chain not a form
wordFixes.set(266, ["exchange v."]);                // change
wordFixes.set(271, ["charitable adj."]);            // charity
wordFixes.set(274, []);                             // check - garbled
wordFixes.set(275, ["cheerful adj."]);              // cheer
wordFixes.set(277, ["chemist n.", "chemistry n."]); // chemical
wordFixes.set(282, ["childhood n."]);               // child
wordFixes.set(287, []);                             // chocolate - choose not a form
wordFixes.set(289, ["choice n."]);                  // choose
wordFixes.set(300, ["clearly adv.", "clear adj."]); // clean (was "clearly" garbled)
wordFixes.set(311, ["cloudy adj."]);                // cloud
wordFixes.set(318, ["collection n."]);              // collect
wordFixes.set(321, ["colourful adj.", "colourless adj."]); // colour
wordFixes.set(323, ["comfort n.", "comfort v."]);   // comfortable
wordFixes.set(324, ["uncommon adj."]);              // common
wordFixes.set(325, ["communication n."]);           // communicate
wordFixes.set(328, []);                             // compare - compete not a form
wordFixes.set(330, ["complaint n."]);               // complain
wordFixes.set(331, ["completely adv."]);            // complete
wordFixes.set(334, []);                             // concert - conclude not a form
wordFixes.set(337, ["confident adj."]);             // confidence
wordFixes.set(338, ["confidence n."]);              // confident
wordFixes.set(340, ["congratulate v."]);            // congratulation
wordFixes.set(341, ["connection n."]);              // connect (remove "consistency")
wordFixes.set(342, ["considerate adj."]);           // consider
wordFixes.set(346, ["continuous adj."]);            // continue
wordFixes.set(347, []);                             // control - convenience not a form
wordFixes.set(348, ["convenience n."]);             // convenient
wordFixes.set(349, []);                             // conversation - cookery not a form
wordFixes.set(350, []);                             // cook - coolly garbled
wordFixes.set(354, []);                             // correct - Chinese sentence
wordFixes.set(359, ["countless adj."]);             // count
wordFixes.set(364, ["coverage n."]);                // cover
wordFixes.set(367, ["creative adj."]);              // create
wordFixes.set(373, ["cultural adj."]);              // culture
wordFixes.set(379, ["cycling n.", "cyclist n.", "recycle v."]); // cycle
wordFixes.set(381, ["dance v.", "dancer n."]);      // daily (dancer garbled)
wordFixes.set(382, []);                             // damage - die not a form
wordFixes.set(384, ["danger n.", "dangerous adj."]); // dancer (was "dangerous" garbled)
wordFixes.set(392, ["dead adj.", "death n.", "dying adj."]); // dead
wordFixes.set(393, ["debatable adj."]);             // deal
wordFixes.set(397, ["decide v.", "decision n."]);   // December (was "decision" garbled)
wordFixes.set(400, ["decoration n."]);              // decorate
wordFixes.set(408, ["depart v."]);                  // departure
wordFixes.set(409, ["dependence n.", "dependent adj.", "independent adj."]); // depend
wordFixes.set(413, ["desirable adj."]);             // desire
wordFixes.set(426, ["different adj."]);             // difference
wordFixes.set(432, ["direct adj.", "director n."]); // direction
wordFixes.set(439, ["disappoint v.", "disappointing adj.", "disappointment n."]); // disappointed
wordFixes.set(445, ["honest adj.", "dishonest adj."]); // dishonest (honeymoon/honorable wrong)
wordFixes.set(459, ["drawing n."]);                 // draw
wordFixes.set(465, []);                             // drop - garbled
wordFixes.set(477, ["easy adj."]);                  // easily
wordFixes.set(479, []);                             // easy - economical not a form
wordFixes.set(484, ["effective adj."]);             // effect
wordFixes.set(489, ["elderly adj."]);               // elder
wordFixes.set(496, ["embarrass v.", "embarrassing adj.", "embarrassment n."]); // embarrassed
wordFixes.set(502, []);                             // enemy - engineer not a form
wordFixes.set(506, ["English adj."]);               // England
wordFixes.set(508, ["enjoyable adj.", "joy n."]);   // enjoy
wordFixes.set(511, ["rich adj."]);                  // enrich
wordFixes.set(513, ["entertain v."]);               // entertainment
wordFixes.set(516, ["environmental adj."]);         // environment
wordFixes.set(517, []);                             // equal - especial not a form
wordFixes.set(531, ["exact adj."]);                 // exactly
wordFixes.set(532, ["examine v."]);                 // exam
wordFixes.set(537, ["exchange v.", "excite v.", "excitement n.", "exciting adj."]); // exchange
wordFixes.set(546, ["expense n.", "inexpensive adj."]); // expensive
wordFixes.set(547, ["experienced adj."]);           // experience
wordFixes.set(549, []);                             // explain - explorer not a form
wordFixes.set(567, ["farmer n."]);                  // farm
wordFixes.set(579, ["feeling n."]);                 // feel
wordFixes.set(589, ["full adj."]);                  // fill
wordFixes.set(591, ["final adj."]);                 // final
wordFixes.set(597, ["firework n."]);                // fire
wordFixes.set(600, ["fish v.", "fisherman n."]);    // first (was "fisherman" garbled)
wordFixes.set(607, ["flat adj."]);                  // flat
wordFixes.set(614, ["flight n."]);                  // fly
wordFixes.set(615, []);                             // focus - following not a form
wordFixes.set(619, []);                             // food - foolish not a form
wordFixes.set(630, ["forget v.", "unforgettable adj."]); // forget
wordFixes.set(637, ["French adj."]);                // France
wordFixes.set(640, ["freezing adj."]);              // freeze
wordFixes.set(644, ["fry v."]);                     // Friday
wordFixes.set(647, ["friendly adj.", "friendship n."]); // friend
wordFixes.set(650, ["frightened adj.", "frightening adj."]); // frighten
wordFixes.set(658, ["fully adv."]);                 // full
wordFixes.set(659, ["funny adj."]);                 // fun
wordFixes.set(672, ["gently adv.", "gentleman n."]); // gentle
wordFixes.set(675, []);                             // geography - Germany not a form
wordFixes.set(683, []);                             // glass - globe not a form
wordFixes.set(686, ["golden adj."]);                // gold
wordFixes.set(691, ["graduation n."]);              // graduate
wordFixes.set(699, ["greeting n."]);                // greet
wordFixes.set(702, ["growth n."]);                  // grow
wordFixes.set(713, ["handy adj."]);                 // hand
wordFixes.set(716, ["happy adj."]);                 // happily
wordFixes.set(721, []);                             // hardworking - phrase
wordFixes.set(722, ["harmful adj.", "harmless adj."]); // harm
wordFixes.set(731, ["heal v."]);                    // health
wordFixes.set(735, ["heated adj."]);                // heat
wordFixes.set(737, ["heavily adv."]);               // heavy
wordFixes.set(738, ["high adj."]);                  // height
wordFixes.set(748, []);                             // hill - history not a form
wordFixes.set(753, ["holder n."]);                  // hold
wordFixes.set(760, ["honesty n."]);                 // honest
wordFixes.set(770, ["hostess n."]);                 // host
wordFixes.set(771, ["heat n."]);                    // hot
wordFixes.set(778, []);                             // however - garbled
wordFixes.set(785, ["hurried adj.", "hurriedly adv."]); // hurry
wordFixes.set(791, []);                             // if - illness not a form
wordFixes.set(794, ["imagination n.", "imaginative adj."]); // illness (was garbled)
wordFixes.set(797, ["important adj."]);             // importance
wordFixes.set(800, ["impress v."]);                 // impression
wordFixes.set(801, ["improvement n."]);             // improve
wordFixes.set(804, ["inclusion n."]);               // include
wordFixes.set(809, ["indoors adv."]);               // indoor
wordFixes.set(812, ["inform v."]);                  // information
wordFixes.set(817, ["interested adj.", "interesting adj."]); // interest
wordFixes.set(821, []);                             // internet - introduction/invention not forms
wordFixes.set(824, ["introduction n.", "inventor n."]); // introduce (remove "invention" duplicate)
wordFixes.set(834, ["Italian adj."]);               // Italy
wordFixes.set(838, ["Japanese adj."]);              // January (was "Japanese" garbled - but January has no forms)
wordFixes.set(856, ["keeper n."]);                  // keep
wordFixes.set(862, ["kind adj.", "kindness n."]);   // kilogram (kindness garbled)
wordFixes.set(872, ["knowledge n.", "knowledgeable adj."]); // know
wordFixes.set(876, []);                             // lake - lawyer/lazily/lecturer not forms
wordFixes.set(885, ["laughter n."]);                // laugh
wordFixes.set(892, []);                             // leave - lecturer not a form
wordFixes.set(893, ["lecturer n."]);                // lecture
wordFixes.set(897, ["lengthen v.", "long adj."]);   // length
wordFixes.set(899, []);                             // let - library not a form
wordFixes.set(905, ["live v.", "lively adj."]);     // life
wordFixes.set(906, []);                             // lift - garbled
wordFixes.set(908, ["likely adj."]);                // like
wordFixes.set(910, ["limited adj."]);               // limit
wordFixes.set(915, []);                             // liquid - garbled
wordFixes.set(921, ["location n."]);                // local
wordFixes.set(922, ["location n."]);                // locate
wordFixes.set(927, ["length n."]);                  // long
wordFixes.set(933, []);                             // loudly - unlucky/unluckily not forms
wordFixes.set(934, ["lovely adj."]);                // love (was [object Object])
wordFixes.set(936, ["lower v."]);                   // low (remove lucky/unlucky)
wordFixes.set(951, ["female adj."]);                // male
wordFixes.set(953, ["management n."]);              // manage
wordFixes.set(955, ["manners n."]);                 // manner
wordFixes.set(959, []);                             // mark - garbled
wordFixes.set(962, ["meaning n."]);                 // match (meaning garbled)
wordFixes.set(970, ["meaning n.", "meaningfully adv."]); // mean
wordFixes.set(973, ["medicine n."]);                // medical
wordFixes.set(976, ["meeting n."]);                 // meet
wordFixes.set(979, ["memorize v."]);                // memory
wordFixes.set(983, ["messenger n."]);               // message
wordFixes.set(995, ["missing adj."]);               // miss
wordFixes.set(1011, []);                            // most - garbled
wordFixes.set(1013, ["motor n."]);                  // motorcycle
wordFixes.set(1017, ["movement n."]);               // move
wordFixes.set(1024, ["music n."]);                  // mushroom (musician garbled)
wordFixes.set(1027, []);                            // name - nature not a form
wordFixes.set(1029, ["national adj."]);             // nation
wordFixes.set(1033, ["naturally adv.", "nature n."]); // natural
wordFixes.set(1034, ["nearby adj.", "nearly adv."]); // nature (was garbled)
wordFixes.set(1037, []);                            // nearby - garbled
wordFixes.set(1041, ["neighbourhood n."]);          // neighbour
wordFixes.set(1054, []);                            // nobody - noisy not a form
wordFixes.set(1059, []);                            // nor - garbled
wordFixes.set(1080, ["office n.", "official adj."]); // offer
wordFixes.set(1089, ["one num."]);                  // once
wordFixes.set(1090, ["first num."]);                // one
wordFixes.set(1092, []);                            // only - garbled
wordFixes.set(1094, ["operate v.", "operation n.", "operator n."]); // open
wordFixes.set(1103, ["organize v."]);               // organization
wordFixes.set(1105, ["other adj."]);                // other
wordFixes.set(1108, ["outdoors adv."]);             // outdoor
wordFixes.set(1113, ["owner n."]);                  // own
wordFixes.set(1118, ["paint v.", "painter n."]);    // pain
wordFixes.set(1133, ["passenger n."]);              // passage
wordFixes.set(1135, ["patience n.", "patiently adv."]); // passport
wordFixes.set(1151, ["personal adj.", "personality n."]); // person
wordFixes.set(1155, ["photographer n."]);           // photo
wordFixes.set(1156, ["physics n."]);                // physical
wordFixes.set(1178, ["pleasant adj."]);             // plate
wordFixes.set(1183, ["please v.", "pleased adj.", "pleasure n."]); // pleasant
wordFixes.set(1191, ["poet n.", "poetry n."]);      // poem
wordFixes.set(1194, ["polite adj.", "impolite adj."]); // policeman
wordFixes.set(1198, ["pollution n."]);              // pollute
wordFixes.set(1202, ["popularity n."]);             // popular
wordFixes.set(1205, ["possibly adv."]);             // possible
wordFixes.set(1207, ["postcard n.", "postman n."]); // post
wordFixes.set(1213, []);                            // pound - practical not a form
wordFixes.set(1214, ["powerful adj."]);             // power
wordFixes.set(1216, ["practise v.", "practical adj."]); // practice
wordFixes.set(1219, ["predictable adj."]);          // predict
wordFixes.set(1220, ["preferable adj."]);           // prefer
wordFixes.set(1221, ["preparation n."]);            // prepare
wordFixes.set(1222, []);                            // present - garbled
wordFixes.set(1224, ["pressure n."]);               // press
wordFixes.set(1230, ["printing n."]);               // print
wordFixes.set(1231, ["prisoner n."]);               // prison
wordFixes.set(1234, ["probably adv."]);             // probable
wordFixes.set(1238, ["product n.", "production n."]); // produce
wordFixes.set(1240, ["profession n."]);             // professional
wordFixes.set(1243, ["projector n."]);              // project
wordFixes.set(1244, ["promising adj."]);            // promise
wordFixes.set(1245, ["pronunciation n."]);          // pronounce
wordFixes.set(1246, ["proper adj."]);               // properly
wordFixes.set(1247, ["protector n."]);              // protect
wordFixes.set(1248, ["pride n."]);                  // proud
wordFixes.set(1249, ["proof n."]);                  // prove
wordFixes.set(1252, ["publicize v."]);              // public (was [object Object])
wordFixes.set(1253, ["publication n."]);            // publish
wordFixes.set(1255, ["purposeful adj."]);           // purpose
wordFixes.set(1262, ["quickly adv."]);              // quick
wordFixes.set(1264, ["quietly adv."]);              // quiet
wordFixes.set(1268, ["racial adj."]);               // race
wordFixes.set(1271, ["rainy adj."]);                // rain
wordFixes.set(1278, ["readily adv."]);              // ready
wordFixes.set(1279, ["real adj.", "reality n."]);   // real
wordFixes.set(1282, ["reasonable adj."]);           // reason
wordFixes.set(1285, ["recent adj."]);               // recent
wordFixes.set(1287, ["recognition n."]);            // recognize
wordFixes.set(1288, ["recorder n."]);               // record
wordFixes.set(1291, ["reduction n."]);              // reduce
wordFixes.set(1293, ["refusal n."]);                // refuse (remove "irregular")
wordFixes.set(1294, ["regularly adv.", "irregular adj."]); // regular
wordFixes.set(1295, ["relate v.", "relative n."]);  // relationship
wordFixes.set(1296, ["relate v."]);                 // relative
wordFixes.set(1297, ["relaxing adj."]);             // relax
wordFixes.set(1305, ["reporter n."]);               // report
wordFixes.set(1308, ["requirement n."]);            // require
wordFixes.set(1312, ["respond v.", "responsible adj."]); // response
wordFixes.set(1314, ["responsibility n."]);         // responsible
wordFixes.set(1318, ["retire v."]);                 // retired
wordFixes.set(1320, ["reusable adj."]);             // reuse
wordFixes.set(1321, ["revision n."]);               // review
wordFixes.set(1326, []);                            // ride - garbled "sense"
wordFixes.set(1334, ["rocky adj."]);                // rock (was [object Object])
wordFixes.set(1345, ["ruler n."]);                  // rude (ruler -> rule, but garbled)
wordFixes.set(1349, ["sadly adv.", "sadness n."]);  // sad
wordFixes.set(1351, ["safely adv."]);               // safe
wordFixes.set(1355, []);                            // salary - sell not a form
wordFixes.set(1356, ["sell v."]);                   // sale
wordFixes.set(1357, ["salty adj."]);                // salt
wordFixes.set(1361, ["satisfy v.", "satisfying adj."]); // satisfied
wordFixes.set(1364, []);                            // sauce - saying not a form
wordFixes.set(1366, ["saying n."]);                 // say
wordFixes.set(1368, []);                            // schedule - garbled
wordFixes.set(1370, ["scientific adj."]);           // science
wordFixes.set(1378, ["seasonal adj."]);             // season
wordFixes.set(1382, ["secretary n."]);              // secret
wordFixes.set(1389, ["selection n."]);              // select
wordFixes.set(1393, ["sensible adj."]);             // sense
wordFixes.set(1397, ["serious adj."]);              // seriously
wordFixes.set(1398, ["servant n."]);                // serve
wordFixes.set(1400, ["settle v.", "settlement n."]); // set
wordFixes.set(1405, ["shameful adj."]);             // shame
wordFixes.set(1415, ["shorten v."]);                // short
wordFixes.set(1422, ["sickness n."]);               // sick
wordFixes.set(1424, ["sightseeing n."]);            // sight
wordFixes.set(1426, ["signal n."]);                 // sign
wordFixes.set(1428, ["silence n."]);                // silent
wordFixes.set(1430, []);                            // silly - similar not a form
wordFixes.set(1432, ["simply adv."]);               // simple
wordFixes.set(1433, []);                            // since - garbled
wordFixes.set(1434, ["song n."]);                   // sing
wordFixes.set(1443, ["skillful adj."]);             // skill
wordFixes.set(1447, ["asleep adj."]);               // sleep
wordFixes.set(1456, ["snowy adj."]);                // snow
wordFixes.set(1459, ["society n."]);                // social
wordFixes.set(1460, ["social adj."]);               // society
wordFixes.set(1464, ["solve v."]);                  // solution
wordFixes.set(1474, []);                            // sound - garbled
wordFixes.set(1475, []);                            // soup - garbled
wordFixes.set(1476, ["southern adj."]);             // south (was [object Object] x2)
wordFixes.set(1479, ["speak v.", "speech n."]);     // spare (was speaker/speech garbled)
wordFixes.set(1480, ["speech n."]);                 // speak
wordFixes.set(1481, ["specially adv."]);            // special
wordFixes.set(1482, ["speak v."]);                  // speech
wordFixes.set(1489, []);                            // square - garbled
wordFixes.set(1497, []);                            // stay - garbled
wordFixes.set(1502, ["sticker n.", "stuck adj."]);  // stick
wordFixes.set(1510, []);                            // story - garbled
wordFixes.set(1512, ["stranger n."]);               // strange
wordFixes.set(1517, ["strength n.", "strengthen v."]); // strike (strength garbled)
wordFixes.set(1518, ["strongly adv."]);             // strong
wordFixes.set(1525, ["success n."]);                // succeed
wordFixes.set(1528, []);                            // such - garbled
wordFixes.set(1529, ["sudden adj."]);               // suddenly
wordFixes.set(1530, ["suffering n."]);              // suffer
wordFixes.set(1532, ["suggestion n."]);             // suggest
wordFixes.set(1535, ["sunny adj."]);                // sun
wordFixes.set(1543, ["surely adv."]);               // sure
wordFixes.set(1545, ["surprised adj."]);            // surprise
wordFixes.set(1548, ["survival n."]);               // survive
wordFixes.set(1549, ["sweeper n."]);                // sweep
wordFixes.set(1561, []);                            // task - tasty not a form
wordFixes.set(1565, ["teacher n."]);                // teach
wordFixes.set(1571, []);                            // telephone - television not a form
wordFixes.set(1572, []);                            // television - retell not a form
wordFixes.set(1578, ["terribly adv."]);             // terrible
wordFixes.set(1580, []);                            // text - garbled
wordFixes.set(1582, ["thankful adj."]);             // thank
wordFixes.set(1589, ["thickly adv."]);              // thick
wordFixes.set(1592, ["thought n."]);                // think
wordFixes.set(1597, ["thoroughly adv."]);           // through
wordFixes.set(1601, []);                            // ticket - untidy not a form
wordFixes.set(1602, ["tidiness n."]);               // tidy
wordFixes.set(1603, []);                            // tie - garbled
wordFixes.set(1606, []);                            // time - tip not a form
wordFixes.set(1622, ["touching adj."]);             // touch
wordFixes.set(1623, ["tourist n."]);                // tour
wordFixes.set(1624, []);                            // tourist - toward not a form
wordFixes.set(1628, []);                            // toy - traditional not a form
wordFixes.set(1630, ["tradition n."]);              // traditional
wordFixes.set(1632, ["trainer n.", "training n."]); // train
wordFixes.set(1633, ["translation n."]);            // translate
wordFixes.set(1634, ["transportation n."]);         // transport
wordFixes.set(1636, ["traveler n."]);               // travel
wordFixes.set(1639, []);                            // trip - troublesome not a form
wordFixes.set(1640, ["troublesome adj."]);          // trouble
wordFixes.set(1643, ["truly adv."]);                // true
wordFixes.set(1650, ["two num."]);                  // twice
wordFixes.set(1652, ["typist n."]);                 // type
wordFixes.set(1656, []);                            // underground - garbled
wordFixes.set(1657, ["underlined adj."]);           // underline
wordFixes.set(1659, ["understanding n.", "misunderstand v.", "misunderstanding n."]); // understand
wordFixes.set(1671, ["usual adj.", "usually adv."]); // unusual
wordFixes.set(1674, []);                            // upstairs - useful/useless/reuse not forms
wordFixes.set(1675, ["useful adj."]);               // use
wordFixes.set(1678, ["usually adv."]);              // usual
wordFixes.set(1681, ["various adj."]);              // variety
wordFixes.set(1682, ["variety n."]);                // various
wordFixes.set(1689, []);                            // violin - visitor not a form
wordFixes.set(1690, ["visitor n."]);                // visit
wordFixes.set(1695, ["waiter n.", "waitress n."]);  // wait
wordFixes.set(1698, ["awake adj."]);                // wake
wordFixes.set(1703, ["warmth n."]);                 // warm
wordFixes.set(1704, ["warning n."]);                // warn
wordFixes.set(1706, ["wasteful adj."]);             // waste
wordFixes.set(1711, ["weakly adv."]);               // weak
wordFixes.set(1714, []);                            // weather - website not a form
wordFixes.set(1718, ["weekly adj."]);               // week
wordFixes.set(1720, ["weight n."]);                 // weekend (was weight garbled)
wordFixes.set(1721, ["weight n."]);                 // weigh
wordFixes.set(1725, ["western adj."]);              // west
wordFixes.set(1740, ["widen v."]);                  // wide
wordFixes.set(1746, ["winner n."]);                 // win
wordFixes.set(1747, ["windy adj."]);                // wind
wordFixes.set(1758, []);                            // within - phrase
wordFixes.set(1762, ["wonderful adj."]);            // wonder
wordFixes.set(1764, ["woods n."]);                  // wood
wordFixes.set(1773, ["wounded adj."]);              // wound
wordFixes.set(1775, ["writer n."]);                 // write
wordFixes.set(1778, ["yearly adj."]);               // year

// Apply fixes
for (const entry of data) {
  const num = entry.number;
  
  if (wordFixes.has(num)) {
    const oldForms = JSON.parse(JSON.stringify(entry.forms));
    const newForms = wordFixes.get(num);
    
    // Check if actually different
    if (JSON.stringify(oldForms) !== JSON.stringify(newForms)) {
      changes.push({
        num,
        word: entry.word,
        old: oldForms,
        new: newForms
      });
      entry.forms = newForms;
    }
  }
}

// Output report
console.log(`Total entries changed: ${changes.length}`);
console.log(`Total words in file: ${data.length}`);
console.log('\n--- DETAILED CHANGES ---\n');

for (const c of changes) {
  console.log(`[${c.num}] ${c.word}`);
  console.log(`  OLD: ${JSON.stringify(c.old)}`);
  console.log(`  NEW: ${JSON.stringify(c.new)}`);
  console.log();
}

// Write fixed file
fs.writeFileSync('E:\\Tina\\自研背单词软件\\words.json', JSON.stringify(data, null, 2), 'utf8');
console.log('\n✅ Fixed data saved to words.json');
