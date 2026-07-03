# 单词内容与 OCR 输出一致性分析

## 时间：2026-06-24 15:20

## 问题
`E:\Tina\自研背单词软件` 中的 `words.json`（应用使用的词库）与 `ocr_output/` 目录（OCR 提取结果）内容不一致。

## 核心数据对比

| 维度 | words.json（应用词库） | ocr_parsed_words.json（OCR解析结果） |
|------|----------------------|-------------------------------------|
| 单词总数 | 1908 | 1279 |
| 数据来源 | 三源合并（原词库1449 + 手动提取239 + OCR 1279） | 仅来自 OCR |
| 中文释义 | ✅ 正常（100% 有释义） | ❌ 全部乱码（0/1279 有可读中文） |
| 英文部分 | 基本正常 | ✅ 英文识别质量好 |
| 编号范围 | 无编号 | 102 - 1734（缺失 1-101 和中间 354 个编号） |

## 不一致的具体表现

### 1. 数量差异：632 个单词
- words.json 有 1908 个词，OCR 只解析出 1279 个
- 差额 632 个词来自其他两个数据源（原词库 + 手动提取）
- OCR 的所有 1279 个词都被包含在 words.json 中（无遗漏）

### 2. OCR 中文释义全部乱码
这是最严重的问题。OCR 输出的 382 个 txt 文件中，中文部分全部被错误识别：
- "能力" 被识别为 "ARS| AW READ"
- "八月" 被识别为 "/\ A"
- "阿姨" 被识别为 "ti; Be; (ABE; SPR;"
- 1279 个词条的 definition 字段，没有任何一个包含 ≥2 个可读中文字符

原因：Tesseract OCR 对扫描件中的中文识别能力不足（已在总结文档中记录此问题）。

### 3. OCR 编号大量缺失
- 编号 1-101 完全缺失（前 101 个词未被 OCR 识别到）
- 编号 102-1734 范围内还有 354 个编号缺失
- 实际解析 1279 个词，理论上应有 1633 个（102-1734），缺失率 21.7%

### 4. 字段结构不同
- words.json: `word, phonetic, pos, meaning, forms, collocations, examples, section, source`
- ocr_parsed: `number, word, phonetic, pos, definition, examples, phrases, forms, notes`

## 数据流向
```
PDF (382页) → pdf_pages/ (PNG图片) → ocr_output/ (TXT文件)
                                            ↓
                                    parse_ocr_v2.js
                                            ↓
                                    ocr_parsed_words.json (1279词，中文乱码)
                                            ↓
              extracted_words.json (239词) ─┐
              words_backup_1449.json (1449词)┼→ build_final_v2.js → words.json (1908词)
              ocr_parsed_words.json (1279词)┘
```

## 结论

不一致是**已知的、已被处理过的**。根据 `word_extraction_summary_20260623.md` 的记录：
1. OCR 中文识别质量不佳 → 已通过原词库匹配 + 手动补充的方式获取中文释义
2. OCR 只识别了 1279 个词 → 已通过三源合并补到 1908 个词
3. words.json 是最终可用版本，OCR 数据仅作为英文信息（音标、例句）的补充来源

## 待优化项
- words.json 中 97 个单词的 meaning 只有一个汉字（如"也""是""和"），虽有效但可能不够完整
- 约 28% 的单词没有例句
- OCR 原始数据保留在 ocr_output/ 中作为参考，但其中的中文释义不可用
