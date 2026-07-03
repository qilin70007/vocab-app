/**
 * 生成最终校对报告
 */

const fs = require('fs');

const WORDS_PATH = 'E:\\Tina\\自研背单词软件\\words.json';
const reportPath = JSON.parse(fs.readFileSync('E:\\Tina\\自研背单词软件\\audit_report_v2.json', 'utf-8'));
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));

let report = `# 背单词软件数据校对报告\n\n`;
report += `生成时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`;
report += `## 总览\n\n`;
report += `| 指标 | 数值 |\n|------|------|\n`;
report += `| 总单词数 | ${reportPath.total} |\n`;
report += `| 问题单词数 | ${reportPath.issues.length} |\n`;
report += `| 问题率 | ${(reportPath.issues.length / reportPath.total * 100).toFixed(1)}% |\n\n`;

report += `## 问题分布\n\n`;
report += `| 问题类型 | 数量 | 可修复性 |\n|----------|------|----------|\n`;
report += `| 音标斜杠格式 | ${reportPath.stats.phonetic_slash} | ✅ 已修复 |\n`;
report += `| 搭配英文含乱码 | ${reportPath.stats.coll_eng_garbage} | ❌ 需人工 |\n`;
report += `| 搭配英文为空 | ${reportPath.stats.coll_eng_empty} | ❌ 需人工 |\n`;
report += `| 搭配中文为空 | ${reportPath.stats.coll_chn_empty} | ⚠️ 部分可补 |\n`;
report += `| 例句含乱码 | ${reportPath.stats.example_garbage} | ❌ 需人工 |\n`;
report += `| 例句不含单词 | ${reportPath.stats.example_not_contain_word} | ⚠️ 可接受 |\n\n`;

report += `## 已完成的自动修复\n\n`;
report += `1. 音标格式统一：/xxx/ → [xxx]（610个）\n`;
report += `2. 搭配 eng/chn 字段拆分（1909个）\n`;
report += `3. 搭配单词重复清理（如 "adultadult" → "adult"）\n`;
report += `4. 搭配页码残留清理（如 "-- 1 of 90 --"）\n`;
report += `5. OCR乱码例句删除（1095个）\n`;
report += `6. 数据错位例句删除（743个）\n`;
report += `7. 错位/乱码搭配删除（153个）\n\n`;

report += `## 需人工校对的问题\n\n`;
report += `### 优先级1：拼写错误（${words.filter(w => /[a-z]*cment|[a-z]*vement/.test(w.word)).length}个估计）\n`;
report += `如 "amazcment" 应为 "amazement"\n\n`;
report += `### 优先级2：搭配中文翻译缺失（${reportPath.stats.coll_chn_empty}个）\n`;
report += `这些搭配的英文部分正确，但中文翻译是OCR乱码或为空\n\n`;
report += `### 优先级3：例句含OCR残留（${reportPath.stats.example_garbage}个）\n`;
report += `例句中有部分OCR残留字符，但主体可读\n\n`;
report += `### 优先级4：例句不含目标单词（${reportPath.stats.example_not_contain_word}个）\n`;
report += `这些例句使用的是同根词或变形，大部分可接受\n\n`;

report += `## 问题单词清单\n\n`;
report += `| 序号 | 单词 | 词义 | 问题数 | 问题类型 |\n`;
report += `|------|------|------|--------|----------|\n`;

reportPath.issues.forEach((item, i) => {
  const types = [...new Set(item.problems.map(p => {
    if (p.issue === 'garbage' || p.issue === 'ocr_garbage') return '例句乱码';
    if (p.issue === 'word_not_in_example') return '例句不含单词';
    if (p.issue === 'chn_empty') return '搭配缺中文';
    if (p.issue === 'eng_empty') return '搭配英文为空';
    if (p.issue === 'eng_garbage') return '搭配英文乱码';
    if (p.issue === 'slash_format') return '音标格式';
    return p.issue;
  }))].join(', ');
  report += `| ${i + 1} | ${item.word} | ${item.meaning} | ${item.problems.length} | ${types} |\n`;
});

fs.writeFileSync('E:\\Tina\\自研背单词软件\\校对报告.md', report, 'utf-8');
console.log(`校对报告已生成: 校对报告.md`);
console.log(`问题单词数: ${reportPath.issues.length}`);
