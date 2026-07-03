# 以 OCR 为基准重建词库

## 时间：2026-06-24 16:02 - 16:15

## 背景
用户决定以 OCR 从 PDF 识别出的 1279 个单词作为需要背诵的原始范围，而不是之前三源合并的 1908 个词。

## 完成的工作

### 1. 数据合并
以 `ocr_parsed_words.json`（1279词）为基准，从 `words.json`（1908词）中匹配提取中文释义：
- 1279 个词全部匹配到释义（匹配率 100%）
- 音标优先使用 words.json 的（OCR 音标有识别误差）
- 例句以 OCR 英文例句为主，补充 words.json 的例句

### 2. 例句清理
OCR 例句中混有大量乱码（Tesseract 对中文识别失败），分三轮清理：
- v1: 截断句号后的乱码尾巴（999条）
- v2: 更激进的截断 + 大写乱码块过滤（1927条）
- v3: 过滤非例句内容 + 乱码前缀清理 + 拼写修正（1859条）
- 最终：98.4% 的词有例句（仅 21 个无例句）

### 3. OCR 拼写修正
- bicyele → bicycle
- ery → entry
- reck → rock

### 4. 部署
- 原 words.json 备份为 `words_backup_1908.json`
- `words_ocr_final.json` 替换为 `words.json`（1279词）
- `data/progress.json` 更新：保留 1274 条匹配的进度，丢弃 634 条
- `data/meta.json` 更新：totalWords = 1279
- `使用说明.md` 更新：1908 → 1279

## 最终词库统计
| 指标 | 数值 | 比例 |
|------|------|------|
| 总词数 | 1279 | 100% |
| 有中文释义 | 1279 | 100% |
| 有音标 | 1279 | 100% |
| 有例句 | 1258 | 98.4% |
| 无例句 | 21 | 1.6% |

## 遗留问题
- 21 个词无例句：baby, bicycle, copy, entry, deny, dig, feel, hide, knife, lend, marry, move, owner, republic, rise, rock, somebody, stand, television, tooth, topic
- 部分词形变化字段（forms）可能还残留少量乱码
- OCR 原始编号有缺失（1-101 完全缺失，中间也有 354 个缺失），但这不影响词库使用
