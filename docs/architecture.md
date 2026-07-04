# 中考词汇背诵助手架构图

本文档用 Mermaid 描述应用的主要运行架构、数据流和离线缓存关系。

## 总体架构

```mermaid
flowchart TB
  user[用户<br/>电脑 / 手机浏览器 / PWA] --> ui[前端静态应用<br/>public/index.html<br/>public/app.js<br/>public/style.css]
  ui --> sw[Service Worker<br/>public/sw.js<br/>离线缓存与旧缓存清理]
  sw --> ui
  ui --> tts[浏览器 Web Speech API<br/>单词 / 词性 / 释义 / 例句朗读]
  ui --> storage[浏览器 localStorage<br/>同步码 / GET 缓存 / 离线待提交队列]
  ui --> api[Express API<br/>server.js]
  sw --> api

  api --> store[应用数据层<br/>createStore]
  store --> words[词库文件<br/>words.json 或 data/words_800.json]
  store --> profiles[学习档案<br/>data/profiles/&lt;同步码&gt;.json]
  store --> uploads[导入上传临时目录<br/>data/uploads]

  api --> static[静态资源服务<br/>express.static(publicDir)]
  static --> ui
```

## 前后端职责

```mermaid
flowchart LR
  subgraph Browser[浏览器 / PWA]
    appjs[public/app.js<br/>页面状态、学习队列、复习、拼写、同步、朗读]
    html[public/index.html<br/>页面结构和控件]
    css[public/style.css<br/>响应式样式和字号]
    swjs[public/sw.js<br/>缓存 shell 资源、API 走网络、导航 network-first]
    local[localStorage<br/>syncCode、离线操作队列、GET 缓存]
  end

  subgraph Node[Node.js + Express]
    server[server.js<br/>createApp / API 路由 / 静态文件]
    store[createStore<br/>词库加载、档案读写、统计计算、间隔复习]
  end

  subgraph Files[文件存储]
    vocab[words.json<br/>或 data/words_800.json]
    profile[data/profiles/*.json<br/>用户学习进度、错题、每日统计、设置]
    legacy[data/progress.json<br/>data/wrong-words.json<br/>data/daily-stats.json]
  end

  html --> appjs
  css --> html
  appjs <--> local
  appjs <--> server
  swjs <--> server
  server --> store
  store --> vocab
  store --> profile
  store --> legacy
```

## 核心学习数据流

```mermaid
sequenceDiagram
  participant U as 用户
  participant FE as public/app.js
  participant API as server.js API
  participant Store as createStore
  participant File as data/profiles/<同步码>.json

  U->>FE: 打开页面 / 切换同步码
  FE->>API: GET /api/words, /api/stats, /api/sections, /api/daily-stats
  API->>Store: loadProfile + loadWords + decorateWord
  Store->>File: 读取学习档案
  Store-->>API: 词库、统计、分区、每日数据
  API-->>FE: JSON 响应
  FE-->>U: 渲染首页、学习卡片、复习队列

  U->>FE: 标记不认识 / 模糊 / 认识
  FE->>API: PUT /api/words/:word/status
  API->>Store: setStatus + touchDaily
  Store->>File: 原子写入档案
  API-->>FE: 返回更新后的 progress
  FE-->>U: 进入下一个单词并刷新统计
```

## 离线与同步策略

```mermaid
flowchart TD
  request[前端请求] --> online{网络可用?}
  online -- 是 --> api[请求 Express API]
  api --> cache[GET 响应写入 localStorage 缓存]
  api --> render[更新页面]

  online -- 否 --> method{请求类型}
  method -- GET --> readcache[读取 localStorage 中的 GET 缓存]
  readcache --> render
  method -- 可排队写操作 --> queue[写入 pendingMutations 队列]
  queue --> optimistic[前端乐观更新]

  reconnect[浏览器 online 事件] --> flush[flushPendingMutations]
  flush --> replay[按原同步码重放待提交请求]
  replay --> refresh[成功后 refreshAll 重新拉取数据]
```

## 主要 API 分组

```mermaid
flowchart TB
  api[Express /api]
  api --> words[词库<br/>GET /words<br/>GET /words/:word<br/>GET /sections]
  api --> stats[统计<br/>GET /stats<br/>GET /daily-stats]
  api --> study[学习状态<br/>PUT /words/:word/status<br/>PUT /words/batch]
  api --> review[复习与错题<br/>POST /review<br/>GET /review-queue<br/>GET/POST/DELETE /wrong-words]
  api --> settings[设置与同步<br/>PUT /settings<br/>GET /sync/summary<br/>GET /ip]
  api --> backup[备份迁移<br/>GET /progress/download<br/>POST /progress/import<br/>POST /progress/upload<br/>POST /reset]
```
