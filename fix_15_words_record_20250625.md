# 15个缺失词条修复记录

## 任务目标
words.json中15个词条内容与编号错位（如56号A.M.的音标是be的音标、893号lecture的音标是job的音标），需要从OCR文本提取正确信息修复。

## 修复的15个词

| 编号 | 单词 | 音标 | 词性 | 释义 | OCR来源页 |
|------|------|------|------|------|-----------|
| 56 | A.M. | /ˈeɪˈem/ | abbr. | 上午 | page_0020 |
| 165 | bicycle | /ˈbaɪsɪkl/ | n. | 自行车 | page_0036 |
| 231 | café | /ˈkæfeɪ/ | n. | 咖啡馆 | page_0046 |
| 344 | work out | - | v. | 算出；解决；弄懂 | page_0303 |
| 372 | cry | /kraɪ/ | v. | 哭；叫喊 n.哭声；叫喊声 | page_0065 |
| 414 | desk | /desk/ | n. | 书桌 | page_0071 |
| 893 | lecture | /ˈlektʃə(r)/ | n. | 讲座；演讲 | page_0142 |
| 955 | manner | /ˈmænə(r)/ | n. | 方式；态度；举止 | page_0154 |
| 1076 | o'clock | /əˈklɒk/ | adv. | ……点钟 | page_0171 |
| 1139 | P.E. | /ˌpiːˈiː/ | abbr. | 体育（physical education） | page_0181 |
| 1149 | performance | /pəˈfɔːməns/ | n. | 表演；表现 | page_0182 |
| 1189 | P.M. | /ˌpiːˈem/ | abbr. | 下午 | page_0187 |
| 1294 | regular | /ˈregjələ(r)/ | adj. | 规则的；定期的 | page_0200 |
| 1625 | toward(s) | /təˈwɔːd(z)/ | prep. | 向；朝 | page_0243 |

## 修复方法
1. 用Select-String在ocr_output/*.txt中搜索每个词的词条行
2. 从OCR文本提取音标、词性、释义、例句
3. 用Python脚本批量更新words.json中对应编号的词条
4. 修复前备份原文件为words_backup_before_15fix.json

## 修复后统计
- 总词条数：1785
- 缺音标：1个（344 work out，短语无独立音标，正常）
- 缺释义：0个
- 缺例句：212个（来自旧词库，原本就没有例句）
- 完全空条目：0个

## 关键发现
这些词条错位的原因是之前合并OCR词库和旧词库时，部分编号匹配到了错误的词条数据。不是简单的偏移，而是逐个错位——每个词匹配到了不同的错误内容。

## 文件状态
- words.json：已修复，1785个词条全部有释义
- words_backup_before_15fix.json：修复前备份
- words_backup_1908.json：最早的旧词库备份
