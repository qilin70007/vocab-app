'use strict';

const API_ROOT = '/api';
const STANDALONE_MODE = new URLSearchParams(location.search).get('standalone') === '1'
  || globalThis.VOCAB_STANDALONE === true
  || globalThis.Capacitor?.isNativePlatform?.() === true;
const STORAGE = {
  syncCode: 'vocab.v2.syncCode',
  pending: 'vocab.v2.pendingMutations',
  cachePrefix: 'vocab.v2.3.1.cache.',
  alwaysShowMeaning: 'vocab.v2.alwaysShowMeaning',
  offlineDailyPrefix: 'vocab.v2.offlineDaily.',
  standaloneProfilePrefix: 'vocab.v2.standalone.profile.',
  standaloneWords: 'vocab.v2.standalone.words',
  remoteServer: 'vocab.v2.remoteServer'
};

const state = {
  page: 'home',
  syncCode: '',
  words: [],
  sections: {},
  stats: null,
  daily: null,
  studyQueue: [],
  studyIndex: 0,
  studyRevealed: false,
  reviewQueue: [],
  reviewIndex: 0,
  reviewRevealed: false,
  reviewMode: 'due',
  spellQueue: [],
  spellIndex: 0,
  spellAnswered: false,
  wordPage: 1,
  wordPageSize: 30,
  deferredInstallPrompt: null,
  online: navigator.onLine,
  autoReadActive: false,
  alwaysShowMeaning: readJsonStorage(STORAGE.alwaysShowMeaning, false),
  remoteServer: ''
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function generateSyncCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('');
}

function normalizeSyncCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
}

function cacheKey(path) {
  return `${STORAGE.cachePrefix}${state.syncCode}.${path}`;
}

function readJsonStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Local cache write failed:', error);
  }
}

function pendingMutationCount() {
  return readJsonStorage(STORAGE.pending, []).length;
}

function setConnectionStatus(online, label) {
  state.online = online;
  const count = pendingMutationCount();
  const pill = $('#connectionPill');
  if (!pill) return;
  pill.classList.toggle('online', online && count === 0);
  pill.classList.toggle('offline', !online || count > 0);
  const text = label || (online ? '已同步' : '离线模式');
  pill.querySelector('span').textContent = count ? `${text} · 待同步 ${count}` : text;
}

function enqueueMutation(path, options) {
  const queue = readJsonStorage(STORAGE.pending, []);
  queue.push({
    syncCode: state.syncCode,
    path,
    method: options.method || 'POST',
    body: options.body || null,
    createdAt: new Date().toISOString()
  });
  writeJsonStorage(STORAGE.pending, queue.slice(-2000));
  setConnectionStatus(false, '已离线保存');
}


async function loadStandaloneWords() {
  const cached = readJsonStorage(STORAGE.standaloneWords, null);
  if (cached?.length) return cached;
  const response = await fetch('/words.json');
  if (!response.ok) throw new Error('无法读取手机内置词库');
  const words = await response.json();
  writeJsonStorage(STORAGE.standaloneWords, words);
  return words;
}

function blankStandaloneProgress() {
  return {
    status: 'new', reviewCount: 0, correctCount: 0, wrongCount: 0,
    intervalDays: 0, easeFactor: 2.5, firstSeenAt: null,
    lastReview: null, nextReviewAt: null, updatedAt: null
  };
}

function blankStandaloneProfile() {
  return {
    revision: 0,
    progress: {},
    wrongWords: {},
    dailyStats: {},
    settings: { dailyGoal: 45, dailyGoalEnabled: false },
    updatedAt: null
  };
}

function standaloneProfileKey() {
  return `${STORAGE.standaloneProfilePrefix}${state.syncCode || 'LOCAL'}`;
}

function readStandaloneProfile() {
  return { ...blankStandaloneProfile(), ...readJsonStorage(standaloneProfileKey(), {}) };
}

function writeStandaloneProfile(profile) {
  profile.revision = Number(profile.revision || 0) + 1;
  profile.updatedAt = new Date().toISOString();
  writeJsonStorage(standaloneProfileKey(), profile);
  return profile;
}


function coerceStandaloneProfile(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return blankStandaloneProfile();
  if (payload.profile && typeof payload.profile === 'object') return payload.profile;
  if (payload.progress || payload.wrongWords || payload.dailyStats || payload.settings) return payload;
  return { progress: payload };
}

function mergeStandaloneProfile(current, incoming) {
  const result = {
    ...blankStandaloneProfile(),
    ...current,
    settings: { ...blankStandaloneProfile().settings, ...(current.settings || {}), ...(incoming.settings || {}) },
    progress: { ...(current.progress || {}) },
    wrongWords: { ...(current.wrongWords || {}) },
    dailyStats: { ...(current.dailyStats || {}) }
  };
  for (const [word, raw] of Object.entries(incoming.progress || {})) {
    const existing = result.progress[word];
    const existingTime = Date.parse(existing?.updatedAt || existing?.lastReview || 0) || 0;
    const incomingTime = Date.parse(raw?.updatedAt || raw?.lastReview || 0) || 0;
    if (!existing || incomingTime >= existingTime) result.progress[word] = raw;
  }
  for (const [word, raw] of Object.entries(incoming.wrongWords || {})) {
    const existing = result.wrongWords[word];
    const existingTime = Date.parse(existing?.lastWrongAt || 0) || 0;
    const incomingTime = Date.parse(raw?.lastWrongAt || 0) || 0;
    if (!existing || incomingTime >= existingTime) result.wrongWords[word] = raw;
  }
  for (const [day, raw] of Object.entries(incoming.dailyStats || {})) {
    const merged = { studied: 0, new: 0, learning: 0, known: 0, reviewed: 0, quizCorrect: 0, quizWrong: 0, ...(result.dailyStats[day] || {}) };
    for (const [key, value] of Object.entries(raw || {})) merged[key] = Math.max(Number(merged[key] || 0), Number(value || 0));
    result.dailyStats[day] = merged;
  }
  return result;
}

function standaloneDayKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function standaloneAddDays(date, days) {
  return new Date(date.getTime() + days * 86_400_000);
}

function touchStandaloneDaily(profile, changes) {
  const today = standaloneDayKey();
  const current = { studied: 0, new: 0, learning: 0, known: 0, reviewed: 0, quizCorrect: 0, quizWrong: 0, ...(profile.dailyStats[today] || {}) };
  for (const [key, value] of Object.entries(changes)) current[key] = Number(current[key] || 0) + Number(value || 0);
  profile.dailyStats[today] = current;
}

function standaloneProgress(profile, word) {
  return { ...blankStandaloneProgress(), ...(profile.progress[String(word || '').toLowerCase()] || {}) };
}

function decorateStandaloneWord(profile, word) {
  const key = String(word.word || '').toLowerCase();
  const progress = standaloneProgress(profile, key);
  return {
    ...word,
    ...progress,
    isDue: progress.status !== 'new' && (!progress.nextReviewAt || Date.parse(progress.nextReviewAt) <= Date.now()),
    isWrong: Boolean(profile.wrongWords[key])
  };
}

function calculateStandaloneStats(profile, words) {
  const stats = {
    total: words.length, new: 0, learning: 0, known: 0, due: 0,
    wrong: Object.keys(profile.wrongWords || {}).length,
    progress: 0, streak: 0,
    studiedToday: Number(profile.dailyStats[standaloneDayKey()]?.studied || 0),
    dailyGoal: Number(profile.settings?.dailyGoal || 45),
    dailyGoalEnabled: profile.settings?.dailyGoalEnabled === true
  };
  for (const word of words) {
    const p = standaloneProgress(profile, word.word);
    stats[p.status] += 1;
    if (p.status !== 'new' && (!p.nextReviewAt || Date.parse(p.nextReviewAt) <= Date.now())) stats.due += 1;
  }
  stats.progress = stats.total ? Math.round((stats.known / stats.total) * 100) : 0;
  for (let i = 0; i < 365; i += 1) {
    const day = standaloneDayKey(standaloneAddDays(new Date(), -i));
    if (Number(profile.dailyStats[day]?.studied || 0) > 0) stats.streak += 1;
    else if (i > 0) break;
  }
  return stats;
}

function setStandaloneStatus(profile, word, status) {
  const now = new Date();
  const key = String(word || '').toLowerCase();
  const progress = standaloneProgress(profile, key);
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
    progress.nextReviewAt = standaloneAddDays(now, progress.intervalDays).toISOString();
  } else {
    progress.intervalDays = Math.max(7, progress.intervalDays || 7);
    progress.nextReviewAt = standaloneAddDays(now, progress.intervalDays).toISOString();
  }
  profile.progress[key] = progress;
  touchStandaloneDaily(profile, { studied: 1, [status]: 1 });
  return progress;
}

function addStandaloneWrong(profile, word) {
  const key = String(word || '').toLowerCase();
  const now = new Date().toISOString();
  const current = profile.wrongWords[key] || { wrongCount: 0, addedAt: now };
  profile.wrongWords[key] = { ...current, wrongCount: Number(current.wrongCount || 0) + 1, lastWrongAt: now };
}

function reviewStandaloneWord(profile, word, rating) {
  const now = new Date();
  const key = String(word || '').toLowerCase();
  const progress = standaloneProgress(profile, key);
  progress.reviewCount += 1;
  progress.firstSeenAt ||= now.toISOString();
  progress.lastReview = now.toISOString();
  progress.updatedAt = now.toISOString();
  if (rating === 'again' || rating === 'hard') {
    progress.status = 'learning';
    progress.wrongCount += 1;
    progress.easeFactor = Math.max(1.3, progress.easeFactor - (rating === 'again' ? 0.2 : 0.15));
    progress.intervalDays = rating === 'again' ? 0 : Math.max(1, Math.round((progress.intervalDays || 1) * 1.2));
    progress.nextReviewAt = rating === 'again' ? new Date(now.getTime() + 10 * 60_000).toISOString() : standaloneAddDays(now, progress.intervalDays).toISOString();
    addStandaloneWrong(profile, key);
    touchStandaloneDaily(profile, { studied: 1, reviewed: 1, quizWrong: 1 });
  } else {
    progress.correctCount += 1;
    progress.intervalDays = rating === 'easy'
      ? (progress.intervalDays < 1 ? 4 : Math.max(4, Math.round(progress.intervalDays * progress.easeFactor * 1.3)))
      : (progress.intervalDays < 1 ? 1 : progress.intervalDays === 1 ? 3 : Math.max(3, Math.round(progress.intervalDays * progress.easeFactor)));
    progress.easeFactor = Math.min(3.2, progress.easeFactor + (rating === 'easy' ? 0.15 : 0.05));
    progress.status = progress.intervalDays >= 3 ? 'known' : 'learning';
    progress.nextReviewAt = standaloneAddDays(now, progress.intervalDays).toISOString();
    delete profile.wrongWords[key];
    touchStandaloneDaily(profile, { studied: 1, reviewed: 1, quizCorrect: 1, [progress.status]: 1 });
  }
  profile.progress[key] = progress;
  return progress;
}

async function standaloneApi(path, options = {}) {
  const method = options.method || 'GET';
  const profile = readStandaloneProfile();
  const words = await loadStandaloneWords();
  const url = new URL(path, 'http://standalone.local');

  if (method === 'GET' && url.pathname === '/words') return { total: words.length, offset: 0, limit: words.length, words: words.map((word) => decorateStandaloneWord(profile, word)) };
  if (method === 'GET' && url.pathname === '/stats') return calculateStandaloneStats(profile, words);
  if (method === 'GET' && url.pathname === '/sections') {
    const sections = {};
    for (const word of words) {
      const decorated = decorateStandaloneWord(profile, word);
      sections[decorated.section] ||= { total: 0, new: 0, learning: 0, known: 0, due: 0 };
      sections[decorated.section].total += 1;
      sections[decorated.section][decorated.status] += 1;
      if (decorated.isDue) sections[decorated.section].due += 1;
    }
    return sections;
  }
  if (method === 'GET' && url.pathname === '/daily-stats') {
    const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') || 30)));
    const result = {};
    for (let i = days - 1; i >= 0; i -= 1) {
      const key = standaloneDayKey(standaloneAddDays(new Date(), -i));
      result[key] = { studied: 0, new: 0, learning: 0, known: 0, reviewed: 0, quizCorrect: 0, quizWrong: 0, ...(profile.dailyStats[key] || {}) };
    }
    return { days: result, streak: calculateStandaloneStats(profile, words).streak, today: standaloneDayKey() };
  }
  if (method === 'GET' && url.pathname === '/sync/summary') return { syncCode: state.syncCode, revision: profile.revision, updatedAt: profile.updatedAt, progressCount: Object.keys(profile.progress).length, wrongCount: Object.keys(profile.wrongWords).length, latestBackupAt: null };
  if (method === 'GET' && url.pathname === '/ip') return { ips: [], port: 0 };
  if (method === 'GET' && url.pathname === '/review-queue') {
    const decorated = words.map((word) => decorateStandaloneWord(profile, word));
    const due = decorated.filter((word) => word.isWrong || word.isDue).sort((a, b) => (b.isWrong - a.isWrong) || Date.parse(a.nextReviewAt || 0) - Date.parse(b.nextReviewAt || 0));
    return { total: due.length, words: due.slice(0, Number(url.searchParams.get('limit') || 40)) };
  }
  if (method === 'GET' && url.pathname === '/wrong-words') return { total: Object.keys(profile.wrongWords).length, words: words.map((word) => decorateStandaloneWord(profile, word)).filter((word) => word.isWrong) };
  if (method === 'PUT' && /\/words\/[^/]+\/status$/.test(url.pathname)) {
    const body = JSON.parse(options.body || '{}');
    const word = decodeURIComponent(url.pathname.split('/')[2]).toLowerCase();
    const progress = setStandaloneStatus(profile, word, body.status);
    writeStandaloneProfile(profile);
    return { word, progress };
  }
  if (method === 'POST' && url.pathname === '/review') {
    const body = JSON.parse(options.body || '{}');
    const progress = reviewStandaloneWord(profile, body.word, body.rating);
    writeStandaloneProfile(profile);
    return { word: body.word, rating: body.rating, progress };
  }
  if (method === 'PUT' && url.pathname === '/settings') {
    const body = JSON.parse(options.body || '{}');
    profile.settings.dailyGoal = Math.min(500, Math.max(1, Number(body.dailyGoal || 45)));
    if (Object.prototype.hasOwnProperty.call(body, 'dailyGoalEnabled')) profile.settings.dailyGoalEnabled = body.dailyGoalEnabled === true;
    writeStandaloneProfile(profile);
    return profile.settings;
  }
  if (method === 'POST' && url.pathname === '/progress/import') {
    const incoming = coerceStandaloneProfile(JSON.parse(options.body || '{}'));
    const merged = mergeStandaloneProfile(profile, incoming);
    writeStandaloneProfile(merged);
    return { message: 'Imported', revision: merged.revision, words: Object.keys(merged.progress).length };
  }
  if (method === 'POST' && url.pathname === '/reset') {
    writeJsonStorage(standaloneProfileKey(), blankStandaloneProfile());
    return { message: 'Progress reset', syncCode: state.syncCode };
  }
  throw new Error(`手机离线版暂不支持此操作：${method} ${url.pathname}`);
}

async function api(path, options = {}, config = {}) {
  if (STANDALONE_MODE) {
    setConnectionStatus(true, '手机离线版');
    return standaloneApi(path, options);
  }
  const method = options.method || 'GET';
  const headers = new Headers(options.headers || {});
  headers.set('X-Sync-Code', state.syncCode);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(`${API_ROOT}${path}`, { ...options, headers });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `请求失败：${response.status}`);
    }
    const payload = await response.json();
    setConnectionStatus(true, '已同步');
    if (method === 'GET') writeJsonStorage(cacheKey(path), payload);
    return payload;
  } catch (error) {
    setConnectionStatus(false, '离线模式');
    if (method === 'GET') {
      const cached = readJsonStorage(cacheKey(path), null);
      if (cached) return cached;
    }
    if (config.queueable) {
      enqueueMutation(path, options);
      return { queued: true };
    }
    throw error;
  }
}

async function flushPendingMutations() {
  if (!navigator.onLine) return;
  const queue = readJsonStorage(STORAGE.pending, []);
  if (!queue.length) return;
  const remaining = [];

  for (const item of queue) {
    try {
      const headers = { 'X-Sync-Code': item.syncCode };
      if (item.body) headers['Content-Type'] = 'application/json';
      const response = await fetch(`${API_ROOT}${item.path}`, {
        method: item.method,
        headers,
        body: item.body
      });
      if (!response.ok) remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }

  writeJsonStorage(STORAGE.pending, remaining);
  if (!remaining.length) {
    clearOfflineDailyStats();
    showToast('离线记录已同步');
    await refreshAll({ quiet: true });
  } else {
    setConnectionStatus(false, `仍有 ${remaining.length} 条待同步`);
  }
}


function todayKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function offlineDailyKey() {
  return `${STORAGE.offlineDailyPrefix}${state.syncCode}`;
}

function readOfflineDailyStats() {
  return readJsonStorage(offlineDailyKey(), {});
}

function writeOfflineDailyStats(value) {
  writeJsonStorage(offlineDailyKey(), value);
}

function clearOfflineDailyStats() {
  try { localStorage.removeItem(offlineDailyKey()); } catch {}
}

function touchOfflineDaily(changes) {
  const daily = readOfflineDailyStats();
  const day = todayKey();
  const current = { studied: 0, new: 0, learning: 0, known: 0, reviewed: 0, quizCorrect: 0, quizWrong: 0, ...(daily[day] || {}) };
  for (const [key, value] of Object.entries(changes)) current[key] = Number(current[key] || 0) + Number(value || 0);
  daily[day] = current;
  writeOfflineDailyStats(daily);
  if (state.daily?.days) {
    state.daily.days[day] ||= { studied: 0, new: 0, learning: 0, known: 0, reviewed: 0, quizCorrect: 0, quizWrong: 0 };
    for (const [key, value] of Object.entries(changes)) state.daily.days[day][key] = Number(state.daily.days[day][key] || 0) + Number(value || 0);
  }
  if (state.stats && changes.studied) state.stats.studiedToday = Number(state.stats.studiedToday || 0) + Number(changes.studied || 0);
  persistCurrentCache();
}

function applyDailyOverlay() {
  const overlay = readOfflineDailyStats();
  if (!state.daily?.days) return;
  for (const [day, values] of Object.entries(overlay)) {
    state.daily.days[day] ||= { studied: 0, new: 0, learning: 0, known: 0, reviewed: 0, quizCorrect: 0, quizWrong: 0 };
    for (const key of Object.keys(values || {})) state.daily.days[day][key] = Number(state.daily.days[day][key] || 0) + Number(values[key] || 0);
  }
}

function recomputeLocalStats() {
  const counts = { total: state.words.length, new: 0, learning: 0, known: 0, due: 0, wrong: 0 };
  const now = Date.now();
  for (const word of state.words) {
    counts[word.status || 'new'] = Number(counts[word.status || 'new'] || 0) + 1;
    if (word.isWrong) counts.wrong += 1;
    if ((word.status || 'new') !== 'new' && (!word.nextReviewAt || Date.parse(word.nextReviewAt) <= now)) counts.due += 1;
  }
  const today = todayKey();
  state.stats = {
    ...(state.stats || {}),
    ...counts,
    progress: counts.total ? Math.round((counts.known / counts.total) * 100) : 0,
    studiedToday: Number(state.daily?.days?.[today]?.studied ?? state.stats?.studiedToday ?? 0)
  };
}

function recomputeLocalSections() {
  const sections = {};
  for (const word of state.words) {
    const section = word.section || '#';
    sections[section] ||= { total: 0, new: 0, learning: 0, known: 0, due: 0 };
    sections[section].total += 1;
    sections[section][word.status || 'new'] += 1;
    if ((word.status || 'new') !== 'new' && (!word.nextReviewAt || Date.parse(word.nextReviewAt) <= Date.now())) sections[section].due += 1;
  }
  state.sections = sections;
}

function persistCurrentCache() {
  if (!state.syncCode || !state.words.length) return;
  writeJsonStorage(cacheKey('/words?status=all&limit=5000'), { total: state.words.length, offset: 0, limit: 5000, words: state.words });
  if (state.stats) writeJsonStorage(cacheKey('/stats'), state.stats);
  if (state.sections) writeJsonStorage(cacheKey('/sections'), state.sections);
  if (state.daily) writeJsonStorage(cacheKey('/daily-stats?days=7'), state.daily);
}

function updateLocalProgress(wordText, patch) {
  const word = state.words.find((item) => item.word.toLowerCase() === String(wordText || '').toLowerCase());
  if (!word) return null;
  Object.assign(word, patch, { updatedAt: new Date().toISOString() });
  recomputeLocalStats();
  recomputeLocalSections();
  persistCurrentCache();
  renderHome();
  return word;
}

let toastTimer = null;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}


function normalizeRemoteServer(value) {
  return String(value || '').trim().replace(/\/+$/g, '');
}


function validateRemoteServer(remote) {
  if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(remote)) {
    throw new Error('电脑同步地址必须以 http:// 或 https:// 开头，例如 http://192.168.1.8:3000');
  }
}

async function fetchDesktopServer(url, options = {}) {
  if (STANDALONE_MODE && window.VocabNative?.request) {
    return nativeHttpRequest(url, options);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(url, { ...options, mode: 'cors', signal: controller.signal });
  } catch (error) {
    throw new Error(`无法连接电脑同步地址：${error?.message || '网络请求失败'}。请确认电脑已运行 npm start、手机和电脑在同一网络、地址类似 http://192.168.x.x:3000，且 Windows 防火墙允许 Node.js 访问。`);
  } finally {
    clearTimeout(timeout);
  }
}

function nativeHttpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const callbackId = `cb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    window.__vocabNativeCallbacks = window.__vocabNativeCallbacks || {};
    const timer = setTimeout(() => {
      delete window.__vocabNativeCallbacks[callbackId];
      reject(new Error('原生网络请求超时'));
    }, 10000);
    window.__vocabNativeCallbacks[callbackId] = (payload) => {
      clearTimeout(timer);
      delete window.__vocabNativeCallbacks[callbackId];
      if (!payload || payload.error) {
        reject(new Error(payload?.error || '原生网络请求失败'));
        return;
      }
      resolve({
        ok: payload.status >= 200 && payload.status < 300,
        status: payload.status,
        text: async () => payload.body || '',
        json: async () => JSON.parse(payload.body || '{}')
      });
    };
    try {
      window.VocabNative.request(
        options.method || 'GET',
        url,
        JSON.stringify(options.headers || {}),
        options.body || '',
        callbackId
      );
    } catch (error) {
      clearTimeout(timer);
      delete window.__vocabNativeCallbacks[callbackId];
      reject(error);
    }
  });
}

async function syncStandaloneRemote() {
  const remote = normalizeRemoteServer($('#remoteServerInput')?.value || state.remoteServer || localStorage.getItem(STORAGE.remoteServer));
  if (!remote) {
    showToast('请先填写电脑同步地址，例如 http://192.168.1.8:3000');
    return;
  }
  validateRemoteServer(remote);
  state.remoteServer = remote;
  localStorage.setItem(STORAGE.remoteServer, remote);
  setConnectionStatus(false, '正在连接电脑');

  const syncQuery = `syncCode=${encodeURIComponent(state.syncCode)}`;
  const current = readStandaloneProfile();
  let merged = current;

  const download = await fetchDesktopServer(`${remote}/api/progress/download?${syncQuery}`);
  if (download.ok) {
    const remotePayload = await download.json();
    merged = mergeStandaloneProfile(current, coerceStandaloneProfile(remotePayload));
    writeStandaloneProfile(merged);
  } else if (download.status !== 404) {
    throw new Error(`读取电脑进度失败：${download.status}`);
  }

  const upload = await fetchDesktopServer(`${remote}/api/progress/import?${syncQuery}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ profile: merged })
  });
  if (!upload.ok) {
    const payload = await upload.json().catch(() => ({}));
    throw new Error(payload.error || `上传到电脑失败：${upload.status}`);
  }
  setConnectionStatus(true, '已同步到电脑');
  showToast('手机和电脑进度已同步');
  await refreshAll({ quiet: true });
  await renderDataPage();
}

function statusLabel(status) {
  return status === 'known' ? '已掌握' : status === 'learning' ? '模糊' : '不认识';
}

function formatDate(value) {
  if (!value) return '尚未同步';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '尚未同步';
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function ensureWordArrays(word) {
  for (const key of ['forms', 'collocations', 'examples', 'synonyms', 'antonyms', 'proverbs']) {
    if (!Array.isArray(word[key])) word[key] = word[key] ? [String(word[key])] : [];
  }
  for (const key of ['definitions', 'senses']) {
    if (!Array.isArray(word[key])) word[key] = [];
  }
  return word;
}

async function refreshAll({ quiet = false } = {}) {
  if (!quiet) setConnectionStatus(navigator.onLine, '连接中');
  try {
    const [wordsPayload, stats, sections, daily] = await Promise.all([
      api('/words?status=all&limit=5000'),
      api('/stats'),
      api('/sections'),
      api('/daily-stats?days=7')
    ]);
    state.words = (wordsPayload.words || []).map(ensureWordArrays);
    state.stats = stats;
    state.sections = sections;
    state.daily = daily;
    applyDailyOverlay();
    if (pendingMutationCount()) {
      recomputeLocalStats();
      recomputeLocalSections();
      persistCurrentCache();
    }
    populateSectionSelects();
    renderHome();
    renderCurrentPage();
  } catch (error) {
    console.error(error);
    showToast('无法读取词库，请启动服务器');
  }
}

function renderCurrentPage() {
  if (state.page === 'study') prepareStudyQueue(false);
  if (state.page === 'review') loadReviewCenter();
  if (state.page === 'spell') prepareSpellQueue(false);
  if (state.page === 'words') renderWordList();
  if (state.page === 'data') renderDataPage();
}

function switchPage(page) {
  state.page = page;
  $$('.page').forEach((element) => element.classList.toggle('active', element.id === `page-${page}`));
  $$('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.page === page));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderCurrentPage();
}

function populateSectionSelects() {
  const options = Object.entries(state.sections)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, values]) => `<option value="${escapeHtml(letter)}">${escapeHtml(letter)}（${values.total}）</option>`)
    .join('');
  for (const id of ['studySection', 'spellSection', 'wordSection']) {
    const select = $(`#${id}`);
    if (!select) continue;
    const current = select.value;
    select.innerHTML = `<option value="">全部字母</option>${options}`;
    if ([...select.options].some((option) => option.value === current)) select.value = current;
  }
}

function renderHome() {
  if (!state.stats) return;
  const s = state.stats;
  $('#heroCopy').textContent = `词库共 ${s.total} 词，已掌握 ${s.known} 词。今天先完成新词，再处理 ${s.due} 个到期复习词。`;
  $('#metricGrid').innerHTML = [
    ['词库总量', s.total, '完整可检索'],
    ['未背过', s.new, '优先学习'],
    ['学习中', s.learning, '需要巩固'],
    ['到期复习', s.due, `错题 ${s.wrong} 个`]
  ].map(([label, value, hint]) => `<article class="metric-card"><span>${label}</span><strong>${value}</strong><em>${hint}</em></article>`).join('');

  const goal = Math.max(1, Number(s.dailyGoal || 45));
  const studied = Number(s.studiedToday || 0);
  const limited = s.dailyGoalEnabled === true;
  const pct = limited ? Math.min(100, Math.round((studied / goal) * 100)) : 0;
  $('#goalText').textContent = limited ? `${studied} / ${goal}` : `${studied} / 不限`;
  $('#goalPercent').textContent = `${pct}%`;
  $('#goalRing').style.setProperty('--pct', pct);
  $('#streakCount').textContent = s.streak || 0;
  $('#dailyGoalInput').value = goal;
  const dailyGoalEnabled = $('#dailyGoalEnabled');
  if (dailyGoalEnabled) dailyGoalEnabled.checked = limited;

  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
  const days = state.daily?.days || {};
  const max = Math.max(1, ...Object.values(days).map((item) => Number(item.studied || 0)));
  $('#weekChart').innerHTML = Object.entries(days).map(([day, item]) => {
    const height = Math.max(5, Math.round((Number(item.studied || 0) / max) * 100));
    const isToday = day === state.daily.today;
    return `<div class="week-day ${isToday ? 'today' : ''}"><span>${item.studied || 0}</span><div class="bar-track"><i class="bar" style="height:${height}%"></i></div><small>周${dayNames[new Date(`${day}T00:00:00`).getDay()]}</small></div>`;
  }).join('');

  $('#sectionGrid').innerHTML = Object.entries(state.sections)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, values]) => {
      const progress = values.total ? Math.round((values.known / values.total) * 100) : 0;
      return `<button class="section-button" type="button" data-study-section="${escapeHtml(letter)}"><strong>${escapeHtml(letter)}</strong><small>${values.total} 词</small><span class="mini-progress"><i style="width:${progress}%"></i></span></button>`;
    }).join('');

  $$('[data-study-section]').forEach((button) => button.addEventListener('click', () => {
    switchPage('study');
    $('#studySection').value = button.dataset.studySection;
    prepareStudyQueue(true);
  }));
}

function filteredWords(section, status) {
  let words = [...state.words];
  if (section) words = words.filter((word) => word.section === section);
  if (status === 'notknown') words = words.filter((word) => word.status === 'new' || word.status === 'learning');
  else if (status && status !== 'all') words = words.filter((word) => word.status === status);
  return words;
}



const POS_PATTERN = String.raw`(?:modal\s+v|aux\.?\s*v|v\.?&n\.?|n\.?&v\.?|adj\.?&n\.?|adv\.?|adj\.?|prep\.?|conj\.?|pron\.?|num\.?|art\.?|int\.?|vt\.?|vi\.?|v\.?|n\.?)`;
const POS_SPLIT_RE = new RegExp(`(^|[\\s；;，,])(${POS_PATTERN})\\s*`, 'gi');

function normalizePos(pos) {
  return String(pos || '').replace(/\s+/g, ' ').trim();
}

function derivedSenses(word) {
  const existing = (word.senses || [])
    .filter((sense) => sense && sense.meaning)
    .map((sense) => ({ pos: normalizePos(sense.pos), meaning: String(sense.meaning).trim() }));
  if (existing.length > 1) return existing;

  const text = String(word.meaning || '').trim();
  const matches = [...text.matchAll(POS_SPLIT_RE)];
  if (!matches.length) return existing.length ? existing : (text ? [{ pos: normalizePos(word.pos), meaning: text }] : []);

  const senses = [];
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const next = matches[i + 1];
    const start = match.index + match[0].length;
    const end = next ? next.index : text.length;
    const meaning = text.slice(start, end).replace(/^[\s；;，,。.]+|[\s；;，,。.]+$/g, '');
    if (meaning) senses.push({ pos: normalizePos(match[2]), meaning });
  }
  return senses.length > 1 ? senses : (existing.length ? existing : [{ pos: normalizePos(word.pos), meaning: text }]);
}

function wordOrderValue(word) {
  const value = Number(word.id || word.number || word.sequence || 0);
  return Number.isFinite(value) && value > 0 ? value : Number.MAX_SAFE_INTEGER;
}

function compareWordOrder(a, b) {
  return (wordOrderValue(a) - wordOrderValue(b)) || a.word.localeCompare(b.word);
}

function wordMeaningHtml(word) {
  const senses = derivedSenses(word);
  if (senses.length > 1) {
    return `<div class="sense-list">${senses.map((sense) => `<div class="sense-item">${sense.pos ? `<span>${escapeHtml(sense.pos)}</span>` : ''}<strong>${escapeHtml(sense.meaning)}</strong></div>`).join('')}</div>`;
  }
  return `<div class="answer-meaning">${escapeHtml(senses[0]?.meaning || word.meaning)}</div>`;
}

function prepareStudyQueue(force = true) {
  if (!force && state.studyQueue.length) {
    renderStudyCard();
    return;
  }
  const section = $('#studySection')?.value || '';
  const status = $('#studyStatus')?.value || 'notknown';
  const order = $('#studyOrder')?.value || 'alpha';
  let queue = filteredWords(section, status);
  if (order === 'random') queue.sort(() => Math.random() - 0.5);
  else queue.sort((a, b) => a.word.localeCompare(b.word));
  const shouldLimit = status === 'notknown' && state.stats?.dailyGoalEnabled === true;
  const limit = shouldLimit ? Number(state.stats?.dailyGoal || 45) : queue.length;
  state.studyQueue = queue.slice(0, limit);
  state.studyIndex = 0;
  state.studyRevealed = state.alwaysShowMeaning;
  renderStudyCard();
}

function wordDetailsHtml(word) {
  const groups = [];
  const senses = derivedSenses(word);
  if (senses.length > 1) groups.push(['词性释义', senses.map((sense) => `${sense.pos ? `${sense.pos} ` : ''}${sense.meaning}`)]);
  if (word.synonyms.length) groups.push(['近义词', word.synonyms]);
  if (word.antonyms.length) groups.push(['反义词', word.antonyms]);
  if (word.proverbs.length) groups.push(['谚语', word.proverbs]);
  if (word.forms.length) groups.push(['词形与语法', word.forms]);
  if (word.collocations.length) groups.push(['常用搭配', word.collocations]);
  if (word.examples.length) groups.push(['例句', word.examples]);
  return groups.map(([title, values]) => `<section class="detail-group"><strong>${title}</strong><ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul></section>`).join('');
}

function renderStudyCard() {
  const card = $('#studyCard');
  $('#studyQueueCount').textContent = `${state.studyQueue.length} 词`;
  if (!state.studyQueue.length || state.studyIndex >= state.studyQueue.length) {
    card.innerHTML = `<div class="empty-state"><span>🎉</span><p>本轮学习完成。重新生成队列，或去复习中心巩固。</p><button class="primary-btn" type="button" data-restart-study>再来一轮</button></div>`;
    $('[data-restart-study]')?.addEventListener('click', () => prepareStudyQueue(true));
    refreshStatsOnly();
    return;
  }

  const word = state.studyQueue[state.studyIndex];
  const position = state.studyIndex + 1;
  const pct = Math.round((position / state.studyQueue.length) * 100);
  card.innerHTML = `
    <div class="flashcard-head">
      <div><h2 class="word-title">${escapeHtml(word.word)}</h2><div class="word-meta">${word.phonetic ? `<span>${escapeHtml(word.phonetic)}</span>` : ''}${word.pos ? `<span class="tag">${escapeHtml(word.pos)}</span>` : ''}<span class="tag">${statusLabel(word.status)}</span></div></div>
      <button class="speak-btn" type="button" data-speak="${escapeHtml(word.word)}" aria-label="朗读单词">🔊</button>
    </div>
    <div class="reveal-zone">
      ${state.alwaysShowMeaning || state.studyRevealed
        ? `<div class="answer-block">${wordMeaningHtml(word)}<div class="detail-groups">${wordDetailsHtml(word)}</div></div>`
        : '<button class="primary-btn" type="button" data-reveal-study>先回忆，再显示释义</button>'}
    </div>
    <div class="study-actions">
      <button class="action-again" type="button" data-study-status="new">😕 不认识</button>
      <button class="action-hard" type="button" data-study-status="learning">🤔 模糊</button>
      <button class="action-good" type="button" data-study-status="known">😊 认识</button>
    </div>
    <div class="card-footer"><span>${position} / ${state.studyQueue.length}</span><span class="progress-track"><i style="width:${pct}%"></i></span><span>${word.sourcePage ? `书第 ${word.sourcePage} 页` : ''}</span></div>`;

  $('[data-reveal-study]')?.addEventListener('click', revealStudy);
  $$('[data-study-status]').forEach((button) => button.addEventListener('click', () => markStudyWord(button.dataset.studyStatus)));
  $('[data-speak]')?.addEventListener('click', () => speakWord(word.word));
}

function revealStudy() {
  state.studyRevealed = true;
  renderStudyCard();
}

async function markStudyWord(status) {
  const word = state.studyQueue[state.studyIndex];
  if (!word) return;
  word.status = status;
  const sourceWord = updateLocalProgress(word.word, { status, lastReview: new Date().toISOString(), firstSeenAt: word.firstSeenAt || new Date().toISOString() });
  if (sourceWord) Object.assign(word, sourceWord);
  state.studyIndex += 1;
  state.studyRevealed = state.alwaysShowMeaning;
  renderStudyCard();
  try {
    const payload = await api(`/words/${encodeURIComponent(word.word)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }, { queueable: true });
    if (payload.queued) touchOfflineDaily({ studied: 1, [status]: 1 });
    await refreshStatsOnly();
  } catch (error) {
    showToast(error.message);
  }
}

async function refreshStatsOnly() {
  try {
    state.stats = await api('/stats');
    renderHome();
  } catch {
    // Offline optimistic mode keeps the current card usable.
  }
}

async function loadReviewCenter() {
  try {
    const payload = await api('/review-queue?limit=40');
    state.reviewQueue = (payload.words || []).map(ensureWordArrays);
    state.reviewIndex = 0;
    state.reviewRevealed = false;
    state.reviewMode = 'due';
    $('#reviewDueCount').textContent = `${payload.total || 0} 到期`;
    $('#reviewSummaryNumber').textContent = payload.total || 0;
    renderReviewPreview();
  } catch (error) {
    showToast(error.message);
  }
}

function renderReviewPreview() {
  const list = $('#reviewPreview');
  const preview = state.reviewQueue.slice(0, 12);
  list.innerHTML = preview.length
    ? preview.map((word) => `<div class="compact-word"><div><strong>${escapeHtml(word.word)}</strong><small>${escapeHtml(word.meaning)}</small></div><em>${word.isWrong ? '错题' : '到期'}</em></div>`).join('')
    : '<div class="empty-state"><span>✅</span><p>当前没有需要复习的单词。</p></div>';
  $('#reviewPreviewPanel').classList.remove('hidden');
  $('#reviewCard').classList.add('hidden');
}

async function loadWrongReview() {
  try {
    const payload = await api('/wrong-words');
    state.reviewQueue = (payload.words || []).map(ensureWordArrays);
    state.reviewIndex = 0;
    state.reviewRevealed = false;
    state.reviewMode = 'wrong';
    $('#reviewSummaryNumber').textContent = state.reviewQueue.length;
    startReview();
  } catch (error) {
    showToast(error.message);
  }
}

function startReview() {
  if (!state.reviewQueue.length) {
    showToast('当前没有待复习单词');
    return;
  }
  $('#reviewPreviewPanel').classList.add('hidden');
  $('#reviewCard').classList.remove('hidden');
  renderReviewCard();
}

function renderReviewCard() {
  const card = $('#reviewCard');
  if (state.reviewIndex >= state.reviewQueue.length) {
    card.innerHTML = `<div class="empty-state"><span>🎯</span><p>本轮复习完成。</p><button class="primary-btn" type="button" data-review-finish>返回复习中心</button></div>`;
    $('[data-review-finish]')?.addEventListener('click', () => loadReviewCenter());
    refreshAll({ quiet: true });
    return;
  }
  const word = state.reviewQueue[state.reviewIndex];
  card.innerHTML = `
    <div class="review-front">
      <div>
        <h2>${escapeHtml(word.word)}</h2>
        <p>${escapeHtml(word.phonetic || word.pos || '先回忆中文释义')}</p>
        <button class="speak-btn" type="button" data-speak-review aria-label="朗读单词">🔊</button>
      </div>
    </div>
    ${state.reviewRevealed
      ? `<div class="answer-block">${wordMeaningHtml(word)}<div class="detail-groups">${wordDetailsHtml(word)}</div></div><div class="review-rating"><button class="rating-again" data-rating="again">重来<br><small>10 分钟</small></button><button class="rating-hard" data-rating="hard">困难<br><small>1 天</small></button><button class="rating-good" data-rating="good">记得<br><small>间隔增加</small></button><button class="rating-easy" data-rating="easy">很熟<br><small>更长间隔</small></button></div>`
      : '<button class="primary-btn" style="width:100%" type="button" data-reveal-review>显示答案</button>'}
    <div class="card-footer"><span>${state.reviewIndex + 1} / ${state.reviewQueue.length}</span><span class="progress-track"><i style="width:${Math.round(((state.reviewIndex + 1) / state.reviewQueue.length) * 100)}%"></i></span><span>${state.reviewMode === 'wrong' ? '错题专练' : '间隔复习'}</span></div>`;
  $('[data-speak-review]')?.addEventListener('click', () => speakWord(word.word));
  $('[data-reveal-review]')?.addEventListener('click', () => { state.reviewRevealed = true; renderReviewCard(); });
  $$('[data-rating]').forEach((button) => button.addEventListener('click', () => rateReview(button.dataset.rating)));
}

async function rateReview(rating) {
  const word = state.reviewQueue[state.reviewIndex];
  if (!word) return;
  state.reviewIndex += 1;
  state.reviewRevealed = false;
  const nextStatus = ['again', 'hard'].includes(rating) ? 'learning' : 'known';
  const wrongPatch = ['again', 'hard'].includes(rating) ? { isWrong: true } : { isWrong: false };
  updateLocalProgress(word.word, { status: nextStatus, lastReview: new Date().toISOString(), ...wrongPatch });
  renderReviewCard();
  try {
    const payload = await api('/review', {
      method: 'POST',
      body: JSON.stringify({ word: word.word, rating })
    }, { queueable: true });
    if (payload.queued) touchOfflineDaily({ studied: 1, reviewed: 1, [rating === 'again' || rating === 'hard' ? 'quizWrong' : 'quizCorrect']: 1, [nextStatus]: 1 });
    if (payload.progress) {
      const sourceWord = state.words.find((item) => item.word === word.word);
      if (sourceWord) Object.assign(sourceWord, payload.progress);
    }
    await refreshStatsOnly();
  } catch (error) {
    showToast(error.message);
  }
}

function prepareSpellQueue(force = true) {
  if (!force && state.spellQueue.length) {
    renderSpellCard();
    return;
  }
  const section = $('#spellSection')?.value || '';
  const status = $('#spellStatus')?.value || 'notknown';
  const queue = filteredWords(section, status).sort(() => Math.random() - 0.5);
  state.spellQueue = queue.slice(0, 40);
  state.spellIndex = 0;
  state.spellAnswered = false;
  renderSpellCard();
}

function renderSpellCard() {
  const card = $('#spellCard');
  $('#spellCounter').textContent = `${Math.min(state.spellIndex + 1, state.spellQueue.length)} / ${state.spellQueue.length}`;
  if (!state.spellQueue.length || state.spellIndex >= state.spellQueue.length) {
    card.innerHTML = `<div class="empty-state"><span>🏁</span><p>本轮拼写练习完成。</p><button class="primary-btn" type="button" data-restart-spell>再来一轮</button></div>`;
    $('[data-restart-spell]')?.addEventListener('click', () => prepareSpellQueue(true));
    return;
  }
  const word = state.spellQueue[state.spellIndex];
  card.innerHTML = `
    <div class="spell-prompt"><div class="meaning">${escapeHtml(word.meaning)}</div><div class="hint">${escapeHtml(word.pos || '')} · 首字母 ${escapeHtml(word.word.slice(0, 1).toUpperCase())}</div></div>
    <form class="spell-form" id="spellForm"><input id="spellInput" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" ${state.spellAnswered ? 'disabled' : ''} placeholder="输入英文单词"><button class="primary-btn" type="submit">提交</button></form>
    <div id="spellFeedback"></div>
    <div class="spell-actions"><button class="ghost-btn" type="button" data-reveal-spell>看答案</button><button class="secondary-btn" type="button" data-next-spell>下一个</button></div>`;
  $('#spellForm').addEventListener('submit', (event) => { event.preventDefault(); checkSpelling(); });
  $('[data-reveal-spell]').addEventListener('click', () => revealSpelling());
  $('[data-next-spell]').addEventListener('click', nextSpellWord);
  if (!state.spellAnswered) setTimeout(() => $('#spellInput')?.focus(), 0);
}

async function submitSpellResult(word, correct) {
  updateLocalProgress(word.word, { status: correct ? 'known' : 'learning', isWrong: !correct, lastReview: new Date().toISOString() });
  const payload = await api('/review', {
    method: 'POST',
    body: JSON.stringify({ word: word.word, rating: correct ? 'good' : 'again' })
  }, { queueable: true });
  if (payload.queued) touchOfflineDaily({ studied: 1, reviewed: 1, [correct ? 'quizCorrect' : 'quizWrong']: 1, [correct ? 'known' : 'learning']: 1 });
}

async function checkSpelling() {
  if (state.spellAnswered) return;
  const word = state.spellQueue[state.spellIndex];
  const answer = $('#spellInput').value.trim().toLowerCase();
  if (!answer) return showToast('请先输入单词');
  const correct = answer === word.word.toLowerCase();
  state.spellAnswered = true;
  $('#spellInput').disabled = true;
  const feedback = $('#spellFeedback');
  feedback.className = `spell-feedback ${correct ? 'correct' : 'wrong'}`;
  feedback.innerHTML = correct ? '✓ 拼写正确' : `✕ 正确答案：<strong>${escapeHtml(word.word)}</strong>`;
  await submitSpellResult(word, correct).catch((error) => showToast(error.message));
}

async function revealSpelling() {
  if (state.spellAnswered) return;
  const word = state.spellQueue[state.spellIndex];
  state.spellAnswered = true;
  $('#spellInput').value = word.word;
  $('#spellInput').disabled = true;
  const feedback = $('#spellFeedback');
  feedback.className = 'spell-feedback wrong';
  feedback.innerHTML = `答案：<strong>${escapeHtml(word.word)}</strong>`;
  await submitSpellResult(word, false).catch((error) => showToast(error.message));
}

function nextSpellWord() {
  state.spellIndex += 1;
  state.spellAnswered = false;
  renderSpellCard();
}

function getWordListFiltered() {
  const query = ($('#wordSearch')?.value || '').trim().toLowerCase();
  const section = $('#wordSection')?.value || '';
  const status = $('#wordStatus')?.value || 'all';
  return filteredWords(section, status).filter((word) => {
    if (!query) return true;
    return [word.word, word.meaning, word.pos, ...derivedSenses(word).map((sense) => `${sense.pos || ''} ${sense.meaning || ''}`), ...word.synonyms, ...word.antonyms, ...word.proverbs, ...word.forms, ...word.collocations, ...word.examples]
      .join(' ').toLowerCase().includes(query);
  });
}

function renderWordList() {
  const words = getWordListFiltered();
  const pages = Math.max(1, Math.ceil(words.length / state.wordPageSize));
  state.wordPage = Math.min(pages, Math.max(1, state.wordPage));
  const start = (state.wordPage - 1) * state.wordPageSize;
  const pageWords = words.slice(start, start + state.wordPageSize);
  $('#wordCount').textContent = `${words.length} 词`;
  $('#wordTable').innerHTML = pageWords.length
    ? pageWords.map((word) => `<article class="word-row" data-word-detail="${escapeHtml(word.word)}"><div class="word-main"><strong>${escapeHtml(word.word)}</strong><small>${escapeHtml([`#${wordOrderValue(word)}`, word.phonetic, word.pos].filter(Boolean).join(' · '))}</small></div><div class="word-meaning">${escapeHtml(word.meaning)}</div><div class="word-actions"><button class="status-btn new ${word.status === 'new' ? 'active' : ''}" type="button" data-quick-status="new" data-word="${escapeHtml(word.word)}" title="未背过">?</button><button class="status-btn learning ${word.status === 'learning' ? 'active' : ''}" type="button" data-quick-status="learning" data-word="${escapeHtml(word.word)}" title="学习中">~</button><button class="status-btn known ${word.status === 'known' ? 'active' : ''}" type="button" data-quick-status="known" data-word="${escapeHtml(word.word)}" title="已掌握">✓</button></div></article>`).join('')
    : '<div class="empty-state"><span>⌕</span><p>没有找到匹配单词。</p></div>';

  $$('[data-word-detail]').forEach((row) => row.addEventListener('click', () => showWordDialog(row.dataset.wordDetail)));
  $$('[data-quick-status]').forEach((button) => button.addEventListener('click', (event) => {
    event.stopPropagation();
    quickSetStatus(button.dataset.word, button.dataset.quickStatus);
  }));
  renderPagination(pages);
}

function renderPagination(pages) {
  const container = $('#wordPagination');
  if (pages <= 1) { container.innerHTML = ''; return; }
  const numbers = [];
  for (let page = Math.max(1, state.wordPage - 2); page <= Math.min(pages, state.wordPage + 2); page += 1) numbers.push(page);
  container.innerHTML = `<button type="button" data-page-number="${Math.max(1, state.wordPage - 1)}">‹</button>${numbers.map((page) => `<button type="button" class="${page === state.wordPage ? 'active' : ''}" data-page-number="${page}">${page}</button>`).join('')}<button type="button" data-page-number="${Math.min(pages, state.wordPage + 1)}">›</button>`;
  $$('[data-page-number]').forEach((button) => button.addEventListener('click', () => {
    state.wordPage = Number(button.dataset.pageNumber);
    renderWordList();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
}

async function quickSetStatus(wordText, status) {
  const word = state.words.find((item) => item.word === wordText);
  if (!word) return;
  updateLocalProgress(wordText, { status, lastReview: new Date().toISOString(), firstSeenAt: word.firstSeenAt || new Date().toISOString() });
  renderWordList();
  try {
    const payload = await api(`/words/${encodeURIComponent(wordText)}/status`, { method: 'PUT', body: JSON.stringify({ status }) }, { queueable: true });
    if (payload.queued) touchOfflineDaily({ studied: 1, [status]: 1 });
    await refreshStatsOnly();
  } catch (error) {
    showToast(error.message);
  }
}

function showWordDialog(wordText) {
  const word = state.words.find((item) => item.word === wordText);
  if (!word) return;
  $('#wordDialogBody').innerHTML = `<h2 class="dialog-word">${escapeHtml(word.word)}</h2><div class="word-meta">${word.phonetic ? `<span>${escapeHtml(word.phonetic)}</span>` : ''}${word.pos ? `<span class="tag">${escapeHtml(word.pos)}</span>` : ''}<span class="tag">${statusLabel(word.status)}</span><button class="speak-btn" type="button" data-dialog-speak>🔊</button></div><div class="dialog-meaning">${wordMeaningHtml(word)}</div><div class="detail-groups">${wordDetailsHtml(word)}</div>`;
  $('[data-dialog-speak]')?.addEventListener('click', () => speakWord(word.word));
  $('#wordDialog').showModal();
}

async function renderDataPage() {
  $('#syncCodeInput').value = state.syncCode;
  const remoteInput = $('#remoteServerInput');
  if (remoteInput) remoteInput.value = state.remoteServer || localStorage.getItem(STORAGE.remoteServer) || '';
  try {
    const [summary, ip] = await Promise.all([api('/sync/summary'), api('/ip')]);
    const pending = pendingMutationCount();
    const remoteHint = STANDALONE_MODE ? `<br>电脑同步地址：${escapeHtml(state.remoteServer || localStorage.getItem(STORAGE.remoteServer) || '未设置')}` : '';
    $('#syncSummary').innerHTML = `服务器修订版：${summary.revision}<br>已记录：${summary.progressCount} 词 · 错题：${summary.wrongCount} 个<br>手机待上传：${pending} 条${remoteHint}<br>最后同步：${formatDate(summary.updatedAt)}<br>最近自动备份：${formatDate(summary.latestBackupAt)}`;
    $('#syncStatusDot').classList.add('ok');
    $('#lanUrls').innerHTML = (ip.ips || []).map((address) => `<code>http://${escapeHtml(address)}:${ip.port}</code>`).join('');
  } catch {
    $('#syncSummary').textContent = `当前处于离线模式，记录会先保存在手机本地；待上传 ${pendingMutationCount()} 条，恢复连接后会自动同步。`;
    $('#syncStatusDot').classList.remove('ok');
  }
  $('#installSettingsButton').disabled = !state.deferredInstallPrompt;
}

async function applySyncCode() {
  const code = normalizeSyncCode($('#syncCodeInput').value);
  if (code.length < 6) return showToast('同步码至少需要 6 位字母或数字');
  state.syncCode = code;
  localStorage.setItem(STORAGE.syncCode, code);
  state.studyQueue = [];
  state.reviewQueue = [];
  state.spellQueue = [];
  showToast(`已切换到同步码 ${code}`);
  await refreshAll();
  renderDataPage();
}

async function copySyncCode() {
  try {
    await navigator.clipboard.writeText(state.syncCode);
    showToast('同步码已复制');
  } catch {
    $('#syncCodeInput').select();
    document.execCommand('copy');
    showToast('同步码已复制');
  }
}

async function saveDailyGoal() {
  const dailyGoal = Math.min(500, Math.max(1, Number($('#dailyGoalInput').value || 45)));
  const dailyGoalEnabled = $('#dailyGoalEnabled')?.checked === true;
  try {
    await api('/settings', { method: 'PUT', body: JSON.stringify({ dailyGoal, dailyGoalEnabled }) }, { queueable: true });
    if (state.stats) {
      state.stats.dailyGoal = dailyGoal;
      state.stats.dailyGoalEnabled = dailyGoalEnabled;
    }
    renderHome();
    showToast('每日目标已保存');
  } catch (error) {
    showToast(error.message);
  }
}

async function exportData() {
  try {
    if (STANDALONE_MODE) {
      const payload = { app: 'vocab-master-mobile', syncCode: state.syncCode, exportDate: new Date().toISOString(), profile: readStandaloneProfile() };
      await saveJsonFile(`vocab-mobile-backup-${state.syncCode}.json`, payload);
      return;
    }
    const response = await fetch(`${API_ROOT}/progress/download`, { headers: { 'X-Sync-Code': state.syncCode } });
    if (!response.ok) throw new Error('导出失败');
    const payload = await response.json();
    await saveJsonFile(`vocab-backup-${state.syncCode}.json`, payload);
  } catch (error) {
    showToast(error.message);
  }
}

function capacitorPlugin(name) {
  return globalThis.Capacitor?.Plugins?.[name] || null;
}

async function saveJsonFile(filename, payload) {
  const content = JSON.stringify(payload, null, 2);
  if (window.VocabNative?.saveJson) {
    try {
      const result = window.VocabNative.saveJson(filename, content);
      if (result === 'OPENED') {
        showToast('请选择保存目录并确认文件名');
        return;
      }
      if (result === 'SAVED_DOWNLOADS') {
        showToast(`已导出到下载目录：${filename}`);
        return;
      }
    } catch (error) {
      console.warn('Native export failed, falling back to web download', error);
    }
  }
  const filesystem = capacitorPlugin('Filesystem');
  const share = capacitorPlugin('Share');
  if (filesystem?.writeFile) {
    const result = await filesystem.writeFile({
      path: filename,
      data: content,
      directory: 'DOCUMENTS',
      recursive: true
    });
    if (share?.share) {
      await share.share({
        title: '导出学习数据',
        text: '请选择保存位置或发送到微信/文件管理器。',
        url: result.uri,
        dialogTitle: '保存学习数据备份'
      }).catch(() => {});
    }
    showToast(`已导出到文档目录：${filename}`);
    return;
  }

  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 1000);
  showToast('已开始导出学习数据');
}

async function importData(file) {
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    await api('/progress/import', { method: 'POST', body: JSON.stringify(payload) });
    showToast('学习数据已合并');
    await refreshAll();
  } catch (error) {
    showToast(`导入失败：${error.message}`);
  } finally {
    $('#importData').value = '';
  }
}

async function resetData() {
  const confirmation = prompt('此操作会清除当前同步码下的全部进度。请输入 RESET 确认：');
  if (confirmation !== 'RESET') return;
  try {
    await api('/reset', { method: 'POST', body: JSON.stringify({ confirm: 'RESET' }) });
    state.studyQueue = [];
    state.reviewQueue = [];
    state.spellQueue = [];
    showToast('学习记录已清除');
    await refreshAll();
  } catch (error) {
    showToast(error.message);
  }
}



function nativeTextToSpeech() {
  return capacitorPlugin('TextToSpeech') || capacitorPlugin('TextToSpeechPlugin') || null;
}

function hasNativeAndroidBridge() {
  return Boolean(window.VocabNative && typeof window.VocabNative.speak === 'function');
}

function canSpeakText() {
  return hasNativeAndroidBridge() || Boolean(nativeTextToSpeech()?.speak) || 'speechSynthesis' in window;
}

async function stopSpeaking() {
  window.speechSynthesis?.cancel?.();
  if (window.VocabNative?.stopTts) window.VocabNative.stopTts();
  const nativeTts = nativeTextToSpeech();
  if (nativeTts?.stop) await nativeTts.stop().catch(() => {});
}

async function speakTextNative(text, lang, rate = 0.82) {
  if (hasNativeAndroidBridge()) {
    const result = window.VocabNative.speak(String(text || ''), lang, String(rate));
    if (result === 'OK') return true;
  }
  const nativeTts = nativeTextToSpeech();
  if (!nativeTts?.speak) return false;
  await nativeTts.speak({
    text: String(text || ''),
    lang,
    rate,
    pitch: 1.0,
    volume: 1.0,
    category: 'ambient'
  });
  return true;
}

function preferredVoice(lang) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const lowerLang = String(lang).toLowerCase();
  return voices.find((voice) => voice.lang?.toLowerCase() === lowerLang && /mandarin|普通话|国语|xiaoxiao|tingting|mei-jia/i.test(voice.name))
    || voices.find((voice) => voice.lang?.toLowerCase() === lowerLang)
    || voices.find((voice) => voice.lang?.toLowerCase().startsWith(lowerLang.slice(0, 2)))
    || null;
}

function speakText(text, lang, rate = 0.82) {
  return new Promise((resolve) => {
    speakTextNative(text, lang, rate).then((handled) => {
      if (handled) { resolve(); return; }
      if (!('speechSynthesis' in window)) {
        showToast('当前设备暂时无法朗读：请确认手机系统已安装并启用文字转语音引擎');
        resolve();
        return;
      }
    const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      const voice = preferredVoice(lang);
      if (voice) utterance.voice = voice;
      utterance.rate = rate;
      utterance.onend = resolve;
      utterance.onerror = resolve;
      window.speechSynthesis.speak(utterance);
    }).catch(() => resolve());
  });
}

async function speakWord(word) {
  if (!canSpeakText()) return showToast('当前设备暂时无法朗读：请确认手机系统已安装并启用文字转语音引擎');
  await stopSpeaking();
  speakText(word, 'en-US', 0.82);
}

function posToChinese(pos) {
  const normalized = String(pos || '').toLowerCase();
  const tokens = normalized.match(/modal\s*v|aux\.?\s*v|adj\.?|adv\.?|prep\.?|conj\.?|pron\.?|num\.?|art\.?|int\.?|vt\.?|vi\.?|v\.?|n\.?/g) || [];
  const labels = tokens.map((token) => {
    if (/modal|aux/.test(token)) return '助动词';
    if (/^n/.test(token)) return '名词';
    if (/^adj/.test(token)) return '形容词';
    if (/^adv/.test(token)) return '副词';
    if (/^prep/.test(token)) return '介词';
    if (/^conj/.test(token)) return '连词';
    if (/^pron/.test(token)) return '代词';
    if (/^num/.test(token)) return '数词';
    if (/^art/.test(token)) return '冠词';
    if (/^int/.test(token)) return '感叹词';
    if (/^vt/.test(token)) return '及物动词';
    if (/^vi/.test(token)) return '不及物动词';
    if (/^v/.test(token)) return '动词';
    return '';
  }).filter(Boolean);
  return [...new Set(labels)].join('、') || String(pos || '').trim();
}

function spokenMeaning(word) {
  return derivedSenses(word).map((sense) => `${sense.pos ? `${posToChinese(sense.pos)}，` : ''}${sense.meaning}`).join('；') || word.meaning || '';
}

function firstEnglishExample(word) {
  const raw = (word.examples || []).find((example) => /[A-Za-z]/.test(example));
  if (!raw) return '';
  const beforeChinese = String(raw).split(/[\u4e00-\u9fff]/)[0];
  const normalized = beforeChinese.replace(/\s+/g, ' ').trim();
  const sentence = normalized.match(/^[^.!?]+[.!?]/);
  return (sentence ? sentence[0] : normalized).trim();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function speakWordDetails(word) {
  await speakText(word.word, 'en-US', 0.82);
  const meaning = spokenMeaning(word);
  if (meaning) await speakText(meaning, 'zh-CN', 0.88);
  const example = firstEnglishExample(word);
  if (example) await speakText(example, 'en-US', 0.82);
}

async function toggleAutoReadUnknown() {
  if (state.autoReadActive) {
    state.autoReadActive = false;
    stopSpeaking();
    $('#autoReadUnknown').textContent = '连续朗读未掌握的单词';
    return;
  }
  if (!canSpeakText()) return showToast('当前设备暂时无法朗读：请确认手机系统已安装并启用文字转语音引擎');
  state.autoReadActive = true;
  $('#autoReadUnknown').textContent = '停止朗读';
  const section = $('#studySection')?.value || '';
  const words = filteredWords(section, 'notknown').filter((word) => word.status === 'new' || word.status === 'learning');
  if (!words.length) {
    state.autoReadActive = false;
    $('#autoReadUnknown').textContent = '连续朗读不认识';
    showToast('当前没有不认识或模糊的单词');
    return;
  }
  state.studyQueue = words;
  state.studyRevealed = true;
  for (let index = 0; index < words.length; index += 1) {
    if (!state.autoReadActive) break;
    state.studyIndex = index;
    state.studyRevealed = true;
    renderStudyCard();
    await speakWordDetails(words[index]);
    if (state.autoReadActive) await delay(2000);
  }
  state.autoReadActive = false;
  $('#autoReadUnknown').textContent = '连续朗读未掌握的单词';
}


async function installApp() {
  if (!state.deferredInstallPrompt) {
    showToast('请使用浏览器菜单中的“安装应用/添加到主屏幕”');
    return;
  }
  state.deferredInstallPrompt.prompt();
  await state.deferredInstallPrompt.userChoice;
  state.deferredInstallPrompt = null;
  $('#installButton').classList.add('hidden');
  $('#installSettingsButton').disabled = true;
}

function bindEvents() {
  $$('.nav-item').forEach((button) => button.addEventListener('click', () => switchPage(button.dataset.page)));
  $$('[data-page-link]').forEach((button) => button.addEventListener('click', () => switchPage(button.dataset.pageLink)));

  $('#studySection').addEventListener('change', () => prepareStudyQueue(true));
  $('#studyStatus').addEventListener('change', () => prepareStudyQueue(true));
  $('#studyOrder').addEventListener('change', () => prepareStudyQueue(true));
  $('#reloadStudy').addEventListener('click', () => prepareStudyQueue(true));
  $('#autoReadUnknown').addEventListener('click', toggleAutoReadUnknown);
  $('#alwaysShowMeaning').checked = state.alwaysShowMeaning;
  $('#alwaysShowMeaning').addEventListener('change', (event) => {
    state.alwaysShowMeaning = event.target.checked;
    writeJsonStorage(STORAGE.alwaysShowMeaning, state.alwaysShowMeaning);
    state.studyRevealed = state.alwaysShowMeaning;
    renderStudyCard();
  });
  $('#startReviewButton').addEventListener('click', startReview);
  $('#startWrongButton').addEventListener('click', loadWrongReview);
  $('#spellSection').addEventListener('change', () => prepareSpellQueue(true));
  $('#spellStatus').addEventListener('change', () => prepareSpellQueue(true));
  $('#reloadSpell').addEventListener('click', () => prepareSpellQueue(true));

  $('#wordSearch').addEventListener('input', () => { state.wordPage = 1; renderWordList(); });
  $('#wordSection').addEventListener('change', () => { state.wordPage = 1; renderWordList(); });
  $('#wordStatus').addEventListener('change', () => { state.wordPage = 1; renderWordList(); });
  $('#dialogClose').addEventListener('click', () => $('#wordDialog').close());
  $('#wordDialog').addEventListener('click', (event) => {
    if (event.target === $('#wordDialog')) $('#wordDialog').close();
  });

  $('#applySyncCode').addEventListener('click', applySyncCode);
  $('#copySyncCode').addEventListener('click', copySyncCode);
  $('#newSyncCode').addEventListener('click', () => { $('#syncCodeInput').value = generateSyncCode(); });
  $('#syncNow').addEventListener('click', async () => {
    try {
      if (STANDALONE_MODE) await syncStandaloneRemote();
      else { await flushPendingMutations(); await renderDataPage(); }
    } catch (error) {
      setConnectionStatus(false, '同步失败');
      showToast(error.message);
    }
  });
  $('#saveRemoteServer')?.addEventListener('click', () => {
    state.remoteServer = normalizeRemoteServer($('#remoteServerInput')?.value);
    localStorage.setItem(STORAGE.remoteServer, state.remoteServer);
    showToast('电脑同步地址已保存');
    renderDataPage();
  });
  $('#saveGoal').addEventListener('click', saveDailyGoal);
  $('#exportData').addEventListener('click', exportData);
  $('#importData').addEventListener('change', (event) => importData(event.target.files[0]));
  $('#resetData').addEventListener('click', resetData);
  $('#installButton').addEventListener('click', installApp);
  $('#installSettingsButton').addEventListener('click', installApp);

  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input, select, textarea')) return;
    if (state.page === 'study' && state.studyQueue.length) {
      if (event.code === 'Space') { event.preventDefault(); revealStudy(); }
      if (event.key === 'ArrowLeft') markStudyWord('new');
      if (event.key === '1') markStudyWord('learning');
      if (event.key === 'ArrowRight') markStudyWord('known');
    }
    if (state.page === 'review' && !$('#reviewCard').classList.contains('hidden')) {
      if (event.code === 'Space') { event.preventDefault(); state.reviewRevealed = true; renderReviewCard(); }
      if (state.reviewRevealed && ['1', '2', '3', '4'].includes(event.key)) {
        rateReview({ 1: 'again', 2: 'hard', 3: 'good', 4: 'easy' }[event.key]);
      }
    }
  });

  window.addEventListener('online', () => {
    setConnectionStatus(true, '正在同步');
    flushPendingMutations();
  });
  window.addEventListener('offline', () => setConnectionStatus(false, '离线模式'));
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    $('#installButton').classList.remove('hidden');
    $('#installSettingsButton').disabled = false;
  });
}

async function init() {
  const storedCode = normalizeSyncCode(localStorage.getItem(STORAGE.syncCode));
  state.syncCode = storedCode.length >= 6 ? storedCode : generateSyncCode();
  state.remoteServer = normalizeRemoteServer(localStorage.getItem(STORAGE.remoteServer));
  localStorage.setItem(STORAGE.syncCode, state.syncCode);
  bindEvents();
  setConnectionStatus(navigator.onLine, '连接中');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('Service worker registration failed:', error));
  }

  await refreshAll();
  await flushPendingMutations();
}

document.addEventListener('DOMContentLoaded', init);
