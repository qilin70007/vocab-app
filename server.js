'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const multer = require('multer');

const APP_VERSION = '2.1.4';
const DEFAULT_PORT = Number(process.env.PORT || 3000);
const DEFAULT_DAILY_GOAL = 45;
const VALID_STATUSES = new Set(['new', 'learning', 'known']);
const VALID_RATINGS = new Set(['again', 'hard', 'good', 'easy']);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(file, value) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  try {
    fs.renameSync(tmp, file);
  } catch {
    fs.copyFileSync(tmp, file);
    fs.unlinkSync(tmp);
  }
}


function pruneOldBackups(dir, keep = 30) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => ({ name, file: path.join(dir, name), mtimeMs: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  for (const item of files.slice(keep)) fs.rmSync(item.file, { force: true });
}

function toTextList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (!item || typeof item !== 'object') return '';
        return String(item.text || item.form || item.eng || item.example || '').trim();
      })
      .filter(Boolean);
  }
  return String(value)
    .split(/\r?\n|[；;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}


function normalizeSenseItems(raw) {
  return raw
    .map((item) => {
      if (typeof item === 'string') return { pos: '', meaning: item.trim() };
      if (!item || typeof item !== 'object') return null;
      const pos = String(item.pos || item.partOfSpeech || item.part_of_speech || '').trim();
      const meaning = String(item.meaning || item.meaning_zh || item.definition || item.text || '').trim();
      return meaning ? { pos, meaning } : null;
    })
    .filter(Boolean);
}

function toSenseList(record) {
  const candidates = [record.definitions, record.senses, record.meanings, record.meaningItems];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const senses = normalizeSenseItems(candidate);
    if (senses.length) return senses;
  }

  const raw = candidates.find((candidate) => candidate);
  if (!raw) {
    const pos = String(record.pos || record.part_of_speech || record.part_of_speech_ocr || '').trim();
    const meaning = String(record.meaning || record.meaning_zh || record.meaning_zh_ocr || '').trim();
    return meaning ? [{ pos, meaning }] : [];
  }
  return normalizeSenseItems([raw]);
}

function firstMeaning(value) {
  if (!Array.isArray(value)) return toTextList(value)[0] || '';
  for (const item of value) {
    if (typeof item === 'string' && item.trim()) return item.trim();
    if (item && typeof item === 'object') {
      const text = String(item.meaning || item.meaning_zh || item.definition || item.text || '').trim();
      if (text) return text;
    }
  }
  return '';
}

function normalizeWordRecord(record, index) {
  const rawWord = record.word || record.headword || record.term || '';
  const word = String(rawWord).trim();
  const section = /^[a-z]/i.test(word) ? word[0].toUpperCase() : '#';
  const examples = toTextList(record.examples || record.example);
  const definitions = toSenseList(record);

  return {
    id: Number(record.id || record.number || record.sequence_no || index + 1),
    word,
    section: String(record.section_letter || record.section || section).length === 1
      ? String(record.section_letter || record.section || section).toUpperCase()
      : section,
    phonetic: String(record.phonetic || record.phonetic_ocr || '').trim(),
    pos: String(record.pos || record.part_of_speech || record.part_of_speech_ocr || '').trim(),
    meaning: String(record.meaning || record.meaning_zh || record.meaning_zh_ocr || firstMeaning(record.definitions || record.senses || record.meanings)).trim(),
    definitions,
    senses: definitions,
    synonyms: toTextList(record.synonyms || record.synonym || record.similar_words || record.near_synonyms),
    antonyms: toTextList(record.antonyms || record.antonym || record.opposites),
    proverbs: toTextList(record.proverbs || record.proverb || record.sayings),
    forms: toTextList(record.forms || record.word_forms || record.grammar_note_ocr),
    collocations: toTextList(record.collocations || record.phrases || record.usage),
    examples,
    source: String(record.source || '2026年上海市初中英语考纲词汇用法手册').trim(),
    sourcePage: record.source_book_page || record.page || null,
    frequency: Number(record.frequency || record.frequency_marks || 0),
    reviewStatus: String(record.review_status || '').trim()
  };
}

function blankProgress() {
  return {
    status: 'new',
    reviewCount: 0,
    correctCount: 0,
    wrongCount: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    firstSeenAt: null,
    lastReview: null,
    nextReviewAt: null,
    updatedAt: null
  };
}

function normalizeProgress(value = {}) {
  return {
    ...blankProgress(),
    ...value,
    status: VALID_STATUSES.has(value.status) ? value.status : 'new',
    reviewCount: Number(value.reviewCount || 0),
    correctCount: Number(value.correctCount || 0),
    wrongCount: Number(value.wrongCount || 0),
    intervalDays: Number(value.intervalDays || 0),
    easeFactor: Number(value.easeFactor || 2.5)
  };
}

function blankDailyStats() {
  return {
    studied: 0,
    new: 0,
    learning: 0,
    known: 0,
    reviewed: 0,
    quizCorrect: 0,
    quizWrong: 0
  };
}

function blankProfile() {
  return {
    version: 2,
    revision: 0,
    progress: {},
    wrongWords: {},
    dailyStats: {},
    settings: { dailyGoal: DEFAULT_DAILY_GOAL, dailyGoalEnabled: false },
    updatedAt: null
  };
}

function localDateKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86_400_000);
}

function sanitizeSyncCode(value) {
  const code = String(value || 'LOCAL').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{6,16}$/.test(code) ? code : 'LOCAL';
}

function mergeProfile(target, incoming) {
  const result = {
    ...blankProfile(),
    ...target,
    settings: { ...blankProfile().settings, ...(target.settings || {}), ...(incoming.settings || {}) },
    progress: { ...(target.progress || {}) },
    wrongWords: { ...(target.wrongWords || {}) },
    dailyStats: { ...(target.dailyStats || {}) }
  };

  for (const [word, raw] of Object.entries(incoming.progress || {})) {
    const current = result.progress[word];
    const currentTime = Date.parse(current?.updatedAt || current?.lastReview || 0) || 0;
    const incomingTime = Date.parse(raw?.updatedAt || raw?.lastReview || 0) || 0;
    if (!current || incomingTime >= currentTime) result.progress[word] = normalizeProgress(raw);
  }

  for (const [word, raw] of Object.entries(incoming.wrongWords || {})) {
    const current = result.wrongWords[word];
    const currentTime = Date.parse(current?.lastWrongAt || 0) || 0;
    const incomingTime = Date.parse(raw?.lastWrongAt || 0) || 0;
    if (!current || incomingTime >= currentTime) result.wrongWords[word] = raw;
  }

  for (const [day, raw] of Object.entries(incoming.dailyStats || {})) {
    const current = result.dailyStats[day] || blankDailyStats();
    const merged = { ...blankDailyStats() };
    for (const key of Object.keys(merged)) {
      merged[key] = Math.max(Number(current[key] || 0), Number(raw?.[key] || 0));
    }
    result.dailyStats[day] = merged;
  }

  return result;
}

function createStore(options = {}) {
  const rootDir = options.rootDir || __dirname;
  const dataDir = options.dataDir || process.env.DATA_DIR || path.join(rootDir, 'data');
  const wordsPath = options.wordsPath || process.env.WORDS_PATH || path.join(rootDir, 'words.json');
  const fallbackWordsPath = options.fallbackWordsPath || path.join(dataDir, 'words_800.json');
  const profilesDir = path.join(dataDir, 'profiles');
  const backupsDir = path.join(dataDir, 'backups');
  ensureDir(profilesDir);
  ensureDir(backupsDir);
  ensureDir(path.join(dataDir, 'uploads'));

  let words = [];
  let wordMap = new Map();
  let wordFileMtime = 0;

  function loadWords(force = false) {
    const activePath = fs.existsSync(wordsPath) ? wordsPath : fallbackWordsPath;
    if (!fs.existsSync(activePath)) {
      words = [];
      wordMap = new Map();
      return words;
    }
    const stat = fs.statSync(activePath);
    if (!force && words.length && stat.mtimeMs === wordFileMtime) return words;
    const raw = readJson(activePath, []);
    words = (Array.isArray(raw) ? raw : raw.words || [])
      .map(normalizeWordRecord)
      .filter((item) => item.word && item.meaning);
    wordMap = new Map(words.map((item) => [String(item.word || '').toLowerCase(), item]));
    wordFileMtime = stat.mtimeMs;
    return words;
  }

  function profilePath(code) {
    return path.join(profilesDir, `${sanitizeSyncCode(code)}.json`);
  }

  function loadLegacyLocalProfile() {
    const profile = blankProfile();
    profile.progress = readJson(path.join(dataDir, 'progress.json'), {});
    profile.wrongWords = readJson(path.join(dataDir, 'wrong-words.json'), {});
    profile.dailyStats = readJson(path.join(dataDir, 'daily-stats.json'), {});
    return profile;
  }

  function loadProfile(code) {
    const safeCode = sanitizeSyncCode(code);
    const file = profilePath(safeCode);
    const raw = fs.existsSync(file)
      ? readJson(file, blankProfile())
      : safeCode === 'LOCAL'
        ? loadLegacyLocalProfile()
        : blankProfile();
    const profile = {
      ...blankProfile(),
      ...raw,
      settings: { ...blankProfile().settings, ...(raw.settings || {}) },
      progress: raw.progress || {},
      wrongWords: raw.wrongWords || {},
      dailyStats: raw.dailyStats || {}
    };
    for (const [word, value] of Object.entries(profile.progress)) {
      profile.progress[word] = normalizeProgress(value);
    }
    return profile;
  }

  function backupProfile(code, profile) {
    const safeCode = sanitizeSyncCode(code);
    const dir = path.join(backupsDir, safeCode);
    ensureDir(dir);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    writeJsonAtomic(path.join(dir, `${stamp}.json`), {
      app: 'vocab-master',
      backupType: 'auto',
      syncCode: safeCode,
      exportDate: new Date().toISOString(),
      profile
    });
    pruneOldBackups(dir);
  }

  function saveProfile(code, profile) {
    backupProfile(code, profile);
    profile.version = 2;
    profile.revision = Number(profile.revision || 0) + 1;
    profile.updatedAt = new Date().toISOString();
    writeJsonAtomic(profilePath(code), profile);
    return profile;
  }

  function getProgress(profile, word) {
    return normalizeProgress(profile.progress[String(word || '').toLowerCase()]);
  }

  function decorateWord(profile, word) {
    const progressKey = String(word.word || '').toLowerCase();
    const progress = getProgress(profile, progressKey);
    return {
      ...word,
      ...progress,
      isDue: progress.status !== 'new' && (!progress.nextReviewAt || Date.parse(progress.nextReviewAt) <= Date.now()),
      isWrong: Boolean(profile.wrongWords[progressKey])
    };
  }

  function touchDaily(profile, changes) {
    const today = localDateKey();
    const current = { ...blankDailyStats(), ...(profile.dailyStats[today] || {}) };
    for (const [key, value] of Object.entries(changes)) {
      current[key] = Number(current[key] || 0) + Number(value || 0);
    }
    profile.dailyStats[today] = current;
  }

  function setStatus(profile, word, status) {
    if (!VALID_STATUSES.has(status)) throw new Error('Invalid status');
    const now = new Date();
    const progress = getProgress(profile, word);
    progress.status = status;
    progress.reviewCount += 1;
    progress.firstSeenAt ||= now.toISOString();
    progress.lastReview = now.toISOString();
    progress.updatedAt = now.toISOString();

    if (status === 'new') {
      progress.intervalDays = 0;
      progress.nextReviewAt = null;
    } else if (status === 'learning') {
      progress.intervalDays = Math.max(1, progress.intervalDays || 1);
      progress.nextReviewAt = addDays(now, progress.intervalDays).toISOString();
    } else {
      progress.intervalDays = Math.max(7, progress.intervalDays || 7);
      progress.nextReviewAt = addDays(now, progress.intervalDays).toISOString();
    }

    profile.progress[word] = progress;
    touchDaily(profile, { studied: 1, [status]: 1 });
    return progress;
  }

  function addWrong(profile, word) {
    const now = new Date().toISOString();
    const current = profile.wrongWords[word] || { wrongCount: 0, addedAt: now };
    profile.wrongWords[word] = {
      ...current,
      wrongCount: Number(current.wrongCount || 0) + 1,
      lastWrongAt: now
    };
  }

  function applyReview(profile, word, rating) {
    if (!VALID_RATINGS.has(rating)) throw new Error('Invalid rating');
    const now = new Date();
    const progress = getProgress(profile, word);
    progress.reviewCount += 1;
    progress.firstSeenAt ||= now.toISOString();
    progress.lastReview = now.toISOString();
    progress.updatedAt = now.toISOString();

    if (rating === 'again') {
      progress.status = 'learning';
      progress.wrongCount += 1;
      progress.intervalDays = 0;
      progress.easeFactor = Math.max(1.3, progress.easeFactor - 0.2);
      progress.nextReviewAt = new Date(now.getTime() + 10 * 60_000).toISOString();
      addWrong(profile, word);
      touchDaily(profile, { studied: 1, reviewed: 1, quizWrong: 1 });
    } else if (rating === 'hard') {
      progress.status = 'learning';
      progress.wrongCount += 1;
      progress.intervalDays = Math.max(1, Math.round((progress.intervalDays || 1) * 1.2));
      progress.easeFactor = Math.max(1.3, progress.easeFactor - 0.15);
      progress.nextReviewAt = addDays(now, progress.intervalDays).toISOString();
      addWrong(profile, word);
      touchDaily(profile, { studied: 1, reviewed: 1, quizWrong: 1 });
    } else {
      progress.correctCount += 1;
      if (rating === 'good') {
        if (progress.intervalDays < 1) progress.intervalDays = 1;
        else if (progress.intervalDays === 1) progress.intervalDays = 3;
        else progress.intervalDays = Math.max(3, Math.round(progress.intervalDays * progress.easeFactor));
        progress.easeFactor = Math.min(3.2, progress.easeFactor + 0.05);
      } else {
        progress.intervalDays = progress.intervalDays < 1
          ? 4
          : Math.max(4, Math.round(progress.intervalDays * progress.easeFactor * 1.3));
        progress.easeFactor = Math.min(3.2, progress.easeFactor + 0.15);
      }
      progress.status = progress.intervalDays >= 3 ? 'known' : 'learning';
      progress.nextReviewAt = addDays(now, progress.intervalDays).toISOString();
      delete profile.wrongWords[word];
      touchDaily(profile, { studied: 1, reviewed: 1, quizCorrect: 1, [progress.status]: 1 });
    }

    profile.progress[word] = progress;
    return progress;
  }

  function calculateStats(profile) {
    loadWords();
    const stats = {
      total: words.length,
      new: 0,
      learning: 0,
      known: 0,
      due: 0,
      wrong: Object.keys(profile.wrongWords).length,
      progress: 0,
      streak: 0,
      studiedToday: 0,
      dailyGoal: Number(profile.settings.dailyGoal || DEFAULT_DAILY_GOAL),
      dailyGoalEnabled: profile.settings.dailyGoalEnabled === true
    };
    for (const word of words) {
      const p = getProgress(profile, word.word);
      stats[p.status] += 1;
      if (p.status !== 'new' && (!p.nextReviewAt || Date.parse(p.nextReviewAt) <= Date.now())) stats.due += 1;
    }
    stats.progress = stats.total ? Math.round((stats.known / stats.total) * 100) : 0;
    stats.studiedToday = Number(profile.dailyStats[localDateKey()]?.studied || 0);

    for (let i = 0; i < 365; i += 1) {
      const day = localDateKey(addDays(new Date(), -i));
      if (Number(profile.dailyStats[day]?.studied || 0) > 0) stats.streak += 1;
      else if (i > 0) break;
    }
    return stats;
  }

  loadWords(true);

  return {
    dataDir,
    loadWords,
    getWords: () => words,
    getWord: (word) => wordMap.get(String(word || '').toLowerCase()),
    loadProfile,
    saveProfile,
    getProgress,
    decorateWord,
    setStatus,
    applyReview,
    addWrong,
    touchDaily,
    calculateStats,
    mergeProfile
  };
}

function coerceImportedProfile(payload) {
  if (typeof payload === 'string') {
    try {
      return coerceImportedProfile(JSON.parse(payload));
    } catch {
      return blankProfile();
    }
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return blankProfile();
  if (payload.profile && typeof payload.profile === 'object') return payload.profile;
  if (payload.progress || payload.wrongWords || payload.dailyStats || payload.settings) return payload;
  const values = Object.values(payload);
  const looksLikeProgress = values.length > 0 && values.every((value) =>
    value && typeof value === 'object' && ('status' in value || 'reviewCount' in value || 'lastReview' in value)
  );
  return looksLikeProgress ? { progress: payload } : blankProfile();
}

function getLocalIPs() {
  const ips = [];
  const interfaces = os.networkInterfaces();
  for (const group of Object.values(interfaces)) {
    for (const iface of group || []) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

function createApp(options = {}) {
  const rootDir = options.rootDir || __dirname;
  const publicDir = options.publicDir || path.join(rootDir, 'public');
  const store = createStore({ ...options, rootDir });
  const app = express();
  const upload = multer({
    dest: path.join(store.dataDir, 'uploads'),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 }
  });

  app.disable('x-powered-by');
  app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', req.get('origin') || '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sync-Code');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  });
  app.use(express.json({ limit: '2mb' }));
  app.use(express.text({ type: 'text/plain', limit: '2mb' }));
  app.use(express.static(publicDir, { etag: true, maxAge: '1h' }));
  app.use('/api', (req, res, next) => {
    req.syncCode = sanitizeSyncCode(req.get('x-sync-code') || req.query.syncCode || 'LOCAL');
    next();
  });

  function loadRequestProfile(req) {
    return store.loadProfile(req.syncCode);
  }

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, version: APP_VERSION, wordCount: store.loadWords().length });
  });

  app.get('/api/meta', (req, res) => {
    const profile = loadRequestProfile(req);
    res.json({
      appVersion: APP_VERSION,
      syncCode: req.syncCode,
      wordCount: store.loadWords().length,
      revision: profile.revision,
      updatedAt: profile.updatedAt,
      source: '2026年上海市初中英语考纲词汇用法手册'
    });
  });

  app.get('/api/words', (req, res) => {
    const profile = loadRequestProfile(req);
    let result = store.loadWords().map((word) => store.decorateWord(profile, word));
    const section = String(req.query.section || '').toUpperCase();
    const status = String(req.query.status || 'all');
    const search = String(req.query.search || '').trim().toLowerCase();
    const due = String(req.query.due || '') === 'true';
    const sort = String(req.query.sort || 'alpha');

    if (section) result = result.filter((word) => word.section === section);
    if (status === 'notknown') result = result.filter((word) => word.status === 'new' || word.status === 'learning');
    else if (status !== 'all') result = result.filter((word) => word.status === status);
    if (due) result = result.filter((word) => word.isDue || word.isWrong);
    if (search) {
      result = result.filter((word) => [
        word.word,
        word.meaning,
        word.pos,
        word.forms.join(' '),
        word.collocations.join(' '),
        word.examples.join(' ')
      ].join(' ').toLowerCase().includes(search));
    }
    if (sort === 'random') result.sort(() => Math.random() - 0.5);
    else if (sort === 'due') result.sort((a, b) => Date.parse(a.nextReviewAt || 0) - Date.parse(b.nextReviewAt || 0));
    else result.sort((a, b) => (Number(a.id || 0) - Number(b.id || 0)) || a.word.localeCompare(b.word));

    const total = result.length;
    const offset = Math.max(0, Number(req.query.offset || 0));
    const requestedLimit = Number(req.query.limit || total || 1);
    const limit = Math.min(Math.max(1, requestedLimit), 5000);
    result = result.slice(offset, offset + limit);
    res.json({ total, offset, limit, words: result });
  });

  app.get('/api/words/:word', (req, res) => {
    const word = store.getWord(req.params.word);
    if (!word) return res.status(404).json({ error: 'Word not found' });
    const profile = loadRequestProfile(req);
    return res.json(store.decorateWord(profile, word));
  });

  app.get('/api/sections', (req, res) => {
    const profile = loadRequestProfile(req);
    const sections = {};
    for (const word of store.loadWords()) {
      sections[word.section] ||= { total: 0, new: 0, learning: 0, known: 0, due: 0 };
      const p = store.getProgress(profile, word.word);
      sections[word.section].total += 1;
      sections[word.section][p.status] += 1;
      if (p.status !== 'new' && (!p.nextReviewAt || Date.parse(p.nextReviewAt) <= Date.now())) {
        sections[word.section].due += 1;
      }
    }
    res.json(sections);
  });

  app.get('/api/stats', (req, res) => {
    res.json(store.calculateStats(loadRequestProfile(req)));
  });

  app.put('/api/settings', (req, res) => {
    const profile = loadRequestProfile(req);
    const dailyGoal = Math.min(500, Math.max(1, Number(req.body.dailyGoal || DEFAULT_DAILY_GOAL)));
    profile.settings.dailyGoal = dailyGoal;
    if (Object.prototype.hasOwnProperty.call(req.body, 'dailyGoalEnabled')) {
      profile.settings.dailyGoalEnabled = req.body.dailyGoalEnabled === true;
    }
    store.saveProfile(req.syncCode, profile);
    res.json(profile.settings);
  });

  app.put('/api/words/:word/status', (req, res) => {
    const word = String(req.params.word || '').toLowerCase();
    if (!store.getWord(word)) return res.status(404).json({ error: 'Word not found' });
    if (!VALID_STATUSES.has(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
    const profile = loadRequestProfile(req);
    const progress = store.setStatus(profile, word, req.body.status);
    store.saveProfile(req.syncCode, profile);
    return res.json({ word, progress });
  });

  app.put('/api/words/batch', (req, res) => {
    const updates = Array.isArray(req.body.updates) ? req.body.updates.slice(0, 5000) : [];
    const profile = loadRequestProfile(req);
    let updated = 0;
    for (const item of updates) {
      const word = String(item.word || '').toLowerCase();
      if (store.getWord(word) && VALID_STATUSES.has(item.status)) {
        store.setStatus(profile, word, item.status);
        updated += 1;
      }
    }
    store.saveProfile(req.syncCode, profile);
    res.json({ updated });
  });

  app.post('/api/review', (req, res) => {
    const word = String(req.body.word || '').toLowerCase();
    const rating = String(req.body.rating || '');
    if (!store.getWord(word)) return res.status(404).json({ error: 'Word not found' });
    if (!VALID_RATINGS.has(rating)) return res.status(400).json({ error: 'Invalid rating' });
    const profile = loadRequestProfile(req);
    const progress = store.applyReview(profile, word, rating);
    store.saveProfile(req.syncCode, profile);
    return res.json({ word, rating, progress });
  });

  app.get('/api/review-queue', (req, res) => {
    const profile = loadRequestProfile(req);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 40)));
    const all = store.loadWords().map((word) => store.decorateWord(profile, word));
    const due = all
      .filter((word) => word.isWrong || word.isDue)
      .sort((a, b) => {
        if (a.isWrong !== b.isWrong) return a.isWrong ? -1 : 1;
        return Date.parse(a.nextReviewAt || 0) - Date.parse(b.nextReviewAt || 0);
      });
    const selected = [...due];
    if (selected.length < limit) {
      const existing = new Set(selected.map((word) => word.word));
      const learning = all
        .filter((word) => word.status === 'learning' && !existing.has(word.word))
        .sort((a, b) => Date.parse(a.lastReview || 0) - Date.parse(b.lastReview || 0));
      selected.push(...learning.slice(0, limit - selected.length));
    }
    res.json({ total: due.length, words: selected.slice(0, limit) });
  });

  app.get('/api/wrong-words', (req, res) => {
    const profile = loadRequestProfile(req);
    const result = Object.entries(profile.wrongWords)
      .map(([word, value]) => {
        const base = store.getWord(word);
        return base ? { ...store.decorateWord(profile, base), ...value } : null;
      })
      .filter(Boolean)
      .sort((a, b) => Number(b.wrongCount || 0) - Number(a.wrongCount || 0));
    res.json({ total: result.length, words: result });
  });

  app.post('/api/wrong-words/:word', (req, res) => {
    const word = String(req.params.word || '').toLowerCase();
    if (!store.getWord(word)) return res.status(404).json({ error: 'Word not found' });
    const profile = loadRequestProfile(req);
    store.addWrong(profile, word);
    store.saveProfile(req.syncCode, profile);
    return res.json({ word, ...profile.wrongWords[word] });
  });

  app.delete('/api/wrong-words/:word', (req, res) => {
    const profile = loadRequestProfile(req);
    const word = String(req.params.word || '').toLowerCase();
    delete profile.wrongWords[word];
    store.saveProfile(req.syncCode, profile);
    res.json({ removed: word });
  });

  app.post('/api/quiz/result', (req, res) => {
    const results = Array.isArray(req.body.results) ? req.body.results.slice(0, 500) : [];
    const profile = loadRequestProfile(req);
    let correct = 0;
    let wrong = 0;
    for (const item of results) {
      const word = String(item.word || '').toLowerCase();
      if (!store.getWord(word)) continue;
      if (item.correct) {
        delete profile.wrongWords[word];
        store.touchDaily(profile, { quizCorrect: 1 });
        correct += 1;
      } else {
        store.addWrong(profile, word);
        store.touchDaily(profile, { quizWrong: 1 });
        wrong += 1;
      }
    }
    store.saveProfile(req.syncCode, profile);
    res.json({ total: correct + wrong, correct, wrong });
  });

  app.get('/api/daily-stats', (req, res) => {
    const profile = loadRequestProfile(req);
    const days = Math.min(365, Math.max(1, Number(req.query.days || 30)));
    const result = {};
    for (let i = days - 1; i >= 0; i -= 1) {
      const key = localDateKey(addDays(new Date(), -i));
      result[key] = { ...blankDailyStats(), ...(profile.dailyStats[key] || {}) };
    }
    const stats = store.calculateStats(profile);
    res.json({ days: result, streak: stats.streak, today: localDateKey() });
  });

  app.get('/api/progress/export', (req, res) => {
    res.json(loadRequestProfile(req).progress);
  });

  app.get('/api/progress/download', (req, res) => {
    const profile = loadRequestProfile(req);
    const payload = {
      app: 'vocab-master',
      version: APP_VERSION,
      syncCode: req.syncCode,
      exportDate: new Date().toISOString(),
      profile
    };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="vocab-backup-${req.syncCode}.json"`);
    res.json(payload);
  });

  app.post('/api/progress/import', (req, res) => {
    const incoming = coerceImportedProfile(req.body);
    const current = loadRequestProfile(req);
    const merged = store.mergeProfile(current, incoming);
    store.saveProfile(req.syncCode, merged);
    res.json({ message: 'Imported', revision: merged.revision, words: Object.keys(merged.progress).length });
  });

  app.post('/api/progress/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      const payload = JSON.parse(fs.readFileSync(req.file.path, 'utf8'));
      const incoming = coerceImportedProfile(payload);
      const current = loadRequestProfile(req);
      const merged = store.mergeProfile(current, incoming);
      store.saveProfile(req.syncCode, merged);
      fs.unlinkSync(req.file.path);
      return res.json({ message: 'Imported', revision: merged.revision, words: Object.keys(merged.progress).length });
    } catch (error) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: `Invalid backup: ${error.message}` });
    }
  });

  function latestBackupAt(code) {
    const dir = path.join(store.dataDir, 'backups', sanitizeSyncCode(code));
    if (!fs.existsSync(dir)) return null;
    const latest = fs.readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => fs.statSync(path.join(dir, name)).mtimeMs)
      .sort((a, b) => b - a)[0];
    return latest ? new Date(latest).toISOString() : null;
  }

  app.get('/api/sync/summary', (req, res) => {
    const profile = loadRequestProfile(req);
    res.json({
      syncCode: req.syncCode,
      revision: profile.revision,
      updatedAt: profile.updatedAt,
      progressCount: Object.keys(profile.progress).length,
      wrongCount: Object.keys(profile.wrongWords).length,
      latestBackupAt: latestBackupAt(req.syncCode)
    });
  });

  app.post('/api/reset', (req, res) => {
    if (req.body.confirm !== 'RESET') return res.status(400).json({ error: 'Confirmation required' });
    const profile = blankProfile();
    store.saveProfile(req.syncCode, profile);
    res.json({ message: 'Progress reset', syncCode: req.syncCode });
  });

  app.get('/api/ip', (req, res) => {
    res.json({ ips: getLocalIPs(), port: Number(process.env.PORT || DEFAULT_PORT) });
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'API not found' }));
  app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) return next(error);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return { app, store };
}

function startServer(options = {}) {
  const port = Number(options.port || process.env.PORT || DEFAULT_PORT);
  const { app } = createApp(options);
  return app.listen(port, '0.0.0.0', () => {
    console.log('\n========================================');
    console.log(`  📖 中考词汇背诵助手 v${APP_VERSION}`);
    console.log('========================================');
    console.log(`  电脑访问: http://localhost:${port}`);
    for (const ip of getLocalIPs()) console.log(`  手机访问: http://${ip}:${port}`);
    console.log('========================================\n');
  });
}

if (require.main === module) startServer();

module.exports = {
  APP_VERSION,
  createApp,
  createStore,
  startServer,
  normalizeWordRecord,
  sanitizeSyncCode
};
