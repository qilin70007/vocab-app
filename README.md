# 中考词汇背诵助手 v2

面向《2026年上海市初中英语考纲词汇用法手册》结构化词库的跨设备学习应用。项目采用 **Node.js + Express + 原生 Web/PWA**，手机、Windows 和普通浏览器共用一套代码。

## 已实现

- 每日新词计划，默认 40 词
- “未背过 / 待巩固 / 已掌握”三级标记
- 快速筛选“不认识＋模糊”词汇
- 主动回忆卡片、语音朗读、键盘快捷键
- 基于记忆间隔的复习队列（重来 / 困难 / 记得 / 很熟）
- 中文提示拼写英文，错词自动进入错题本
- A-Z 分区、全文搜索、词形/搭配/例句详情
- 同步码隔离学习档案；手机和电脑使用相同同步码即可共享进度
- PWA 安装、离线词库缓存、离线操作排队并在联网后补同步
- JSON 备份导入/导出
- OCR 结构化数据导入脚本与自动化测试

## 启动

需要 Node.js 18 或更高版本：

```bash
npm install
npm start
```

浏览器打开：

```text
http://localhost:3000
```

手机和电脑连接同一 Wi-Fi 后，打开应用“同步设置”页面，使用页面显示的局域网地址访问。两台设备输入相同同步码后，学习记录会存入同一个档案。

## 导入 OCR 数据

程序默认读取仓库根目录的 `words.json`。如需使用 OCR 数据包中的 `entries.json`，运行：

```bash
npm run import:ocr -- /path/to/entries.json words.imported.json
```

检查自动生成的 `words.imported.json.report.json`。OCR 字段可能包含音标、中文和分栏识别误差，建议人工复核后再替换：

```bash
mv words.imported.json words.json
```

导入脚本支持以下原始字段：

- `headword`
- `phonetic_ocr`
- `part_of_speech_ocr`
- `meaning_zh_ocr`
- `raw_block`
- `source_book_page`
- `frequency_marks`
- `review_status`

## 词库结构

```json
{
  "word": "ability",
  "section": "A",
  "phonetic": "əˈbɪləti",
  "pos": "n.",
  "meaning": "能力；才能；本领",
  "forms": ["able adj. 能够的"],
  "collocations": ["have the ability to do sth. 具备做某事的能力"],
  "examples": ["She has the ability to succeed. 她有取得成功的能力。"],
  "sourcePage": 1,
  "frequency": 1,
  "reviewStatus": "reviewed"
}
```

## 数据与同步

学习档案保存在：

```text
data/profiles/<同步码>.json
```

同步码只是档案标识，不是安全密码。若部署到公网，应在反向代理层增加 HTTPS、身份认证和访问控制。

## 检查与测试

```bash
npm run check
```

测试覆盖词库加载、状态保存、同步码档案隔离和间隔复习更新。

## 部署

应用可部署到支持长期 Node.js 进程和持久磁盘的环境。需要确保 `data/` 目录可写并持久化：

```bash
PORT=3000 DATA_DIR=/persistent/vocab-data npm start
```

不建议部署在无持久磁盘的临时 Serverless 运行环境，否则学习进度可能在重启后丢失。
