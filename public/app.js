'use strict';

const API_ROOT = '/api';
const IS_ANDROID = /Android/i.test(navigator.userAgent || '');
const APK_WEBVIEW_MODE = IS_ANDROID && (
  /; wv\)/i.test(navigator.userAgent || '')
  || ['localhost', 'appassets.androidplatform.net'].includes(location.hostname)
  || location.protocol === 'file:'
  || location.protocol === 'capacitor:'
);
const STANDALONE_MODE = new URLSearchParams(location.search).get('standalone') === '1'
  || globalThis.VOCAB_STANDALONE === true
  || globalThis.Capacitor?.isNativePlatform?.() === true
  || APK_WEBVIEW_MODE;
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
  remoteServer: '',
  serverRevision: null,
  revisionPollTimer: null,
  revisionPollInFlight: false
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
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789';
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
  const text = label || (online ? '宸茶繛鎺? : '绂荤嚎妯″紡');
  pill.querySelector('span').textContent = count ? `${text} 路 寰呭悓姝?${count}` : text;
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
  setConnectionStatus(false, '绂荤嚎宸蹭繚瀛?);
}


async function loadStandaloneWords() {
  const cached = readJsonStorage(STORAGE.standaloneWords, null);
  if (cached?.length) return cached;
  const response = await fetch('words.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('鏃犳硶璇诲彇鎵嬫満鍐呯疆璇嶅簱');
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
    const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days')) || 30));
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
    const section = url.searchParams.get('section') || '';
    const filtered = words.filter((word) => !section || word.section === section);
    const due = filtered.map((word) => decorateStandaloneWord(profile, word)).filter((word) => word.isDue);
    due.sort((a, b) => Date.parse(a.nextReviewAt) - Date.parse(b.nextReviewAt));
    return { words: due, total: due.length };
  }
  if (method === 'GET' && url.pathname === '/wrong-words') {
    const wrongKeys = Object.keys(profile.wrongWords);
    return { words: words.filter((word) => wrongKeys.includes(String(word.word).toLowerCase())), total: wrongKeys.length };
  }
  if (method === 'POST' && url.pathname === '/progress') {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    if (body?.word && body?.status) setStandaloneStatus(profile, body.word, body.status);
    return { ok: true };
  }
  if (method === 'POST' && url.pathname === '/review') {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    if (body?.word && body?.rating) reviewStandaloneWord(profile, body.word, body.rating);
    return { ok: true };
  }
  if (method === 'POST' && url.pathname === '/sync/push') {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    if (body?.profile) mergeStandaloneProfile(profile, coerceStandaloneProfile(body.profile));
    writeStandaloneProfile(profile);
    return { ok: true, revision: profile.revision };
  }
  if (method === 'POST' && url.pathname === '/sync/pull') {
    return { profile: readStandaloneProfile() };
  }
  return null;
}

function isStandaloneMode() {
  return STANDALONE_MODE;
}

function remoteApiBase() {
  if (state.remoteServer) return state.remoteServer.replace(/\/+$/, '');
  return state.online ? API_ROOT : '';
}

async function apiFetch(path, options = {}) {
  if (isStandaloneMode()) return standaloneApi(path, options);
  const base = remoteApiBase();
  if (!base) throw new Error('绂荤嚎妯″紡锛氭棤娉曡繛鎺ユ湇鍔″櫒');
  const url = new URL(path, base);
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : null
  });
  if (!response.ok) throw new Error(`API ${response.status}: ${response.statusText}`);
  return response.json();
}

function statusLabel(status) {
  return { new: '鐢熻瘝', learning: '妯＄硦', known: '鎺屾彙', notknown: '涓嶈璇? }[status] || status || '';
}

function filteredWords(section, status) {
  return state.words.filter((word) => {
    if (section && word.section !== section) return false;
    if (status === 'all') return true;
    if (status === 'notknown') return word.status === 'new' || word.status === 'learning';
    return word.status === status;
  });
}

function derivedSenses(word) {
  return word.senses || [{ pos: word.pos, meaning: word.meaning }];
}

let toastTimer;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}


function normalizeRemoteServer(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function capacitorPlugin(name) {
  return globalThis.Capacitor?.Plugins?.[name] || null;
}

function isNativeApp() {
  return globalThis.Capacitor?.isNativePlatform?.() === true || Boolean(window.VocabNative);
}

// ===== TTS / Speech Synthesis =====
// Callback registry for native TTS completion callbacks
let ttsCallbackId = 0;
const ttsCallbacks = new Map();

// Set up global callback handler for native TTS
window.__ttsCallback = function(callbackId, result) {
  const resolver = ttsCallbacks.get(callbackId);
  if (resolver) {
    ttsCallbacks.delete(callbackId);
    resolver(result || 'done');
  }
};

function nativeTextToSpeech() {
  return capacitorPlugin('TextToSpeech') || capacitorPlugin('TextToSpeechPlugin') || null;
}



// Native Android bridge with async callback support
function speakWithNativeBridge(text, lang, rate) {
  return new Promise((resolve) => {
    if (!hasNativeAndroidBridge()) {
      resolve(false);
      return;
    }

    try {
      if (typeof window.VocabNative.speakWithCallback === 'function') {
        const callbackId = String(++ttsCallbackId);
        const timeout = setTimeout(() => {
          ttsCallbacks.delete(callbackId);
          resolve(false);
        }, 30000);

        ttsCallbacks.set(callbackId, (result) => {
          clearTimeout(timeout);
          if (result === 'error' || result === 'NO_TTS_ENGINE') {
            resolve(false);
          } else {
            resolve(true);
          }
        });

        window.VocabNative.speakWithCallback(String(text || ''), lang, String(rate), callbackId);
      } else {
        const result = window.VocabNative.speak(String(text || ''), lang, String(rate));
        if (result === 'OK') {
          const estimatedMs = Math.min(15000, Math.max(1000, text.length * 150 + 500));
          setTimeout(() => resolve(true), estimatedMs);
        } else if (result === 'NO_TTS_ENGINE') {
          resolve(false);
        } else {
          resolve(false);
        }
      }
    } catch (err) {
      console.warn('Native bridge speak error:', err);
      resolve(false);
    }
  });
}
function canSpeakText() {

  // Check if ANY speech mechanism is available
  if (hasNativeAndroidBridge()) return true;
  if (Boolean(nativeTextToSpeech()?.speak)) return true;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) return true;
  // In native app, always return true - we'll try remote TTS as fallback
  if (isNativeApp()) return true;
  return false;
}

// Warm up TTS engine on app start
async function initTts() {
  if (state.ttsReady || state.ttsInitializing) return;
  state.ttsInitializing = true;

  if (hasNativeAndroidBridge() && typeof window.VocabNative.initTts === 'function') {
    try {
      window.VocabNative.initTts();
    } catch (e) {
      console.warn('Native TTS init failed:', e);
    }
  }
}


async function checkForServerRevisionChange({ force = false } = {}) {
  if (STANDALONE_MODE || !state.syncCode || state.revisionPollInFlight) return;
  if (!force && (document.hidden || !navigator.onLine)) return;

  state.revisionPollInFlight = true;
  try {
    const response = await fetch(`${API_ROOT}/sync/summary`, {
      headers: { 'X-Sync-Code': state.syncCode },
      cache: 'no-store'
    });
    if (!response.ok) return;
    const summary = await response.json();
    const revision = Number(summary.revision || 0);
    const previous = Number(state.serverRevision || 0);
    state.serverRevision = revision;

    if (previous > 0 && revision > previous && !pendingMutationCount()) {
      await refreshAll({ quiet: true });
      showToast('妫€娴嬪埌鐢佃剳鏁版嵁宸叉洿鏂帮紝鐣岄潰宸插埛鏂?);
    }
  } catch (error) {
    console.warn('Revision polling failed', error);
  } finally {
    state.revisionPollInFlight = false;
  }
}


async function checkForServerRevisionChange({ force = false } = {}) {
  if (STANDALONE_MODE || !state.syncCode || state.revisionPollInFlight) return;
  if (!force && (document.hidden || !navigator.onLine)) return;

  state.revisionPollInFlight = true;
  try {
    const response = await fetch(`${API_ROOT}/sync/summary`, {
      headers: { 'X-Sync-Code': state.syncCode },
      cache: 'no-store'
    });
    if (!response.ok) return;
    const summary = await response.json();
    const revision = Number(summary.revision || 0);
    const previous = Number(state.serverRevision || 0);
    state.serverRevision = revision;

    if (previous > 0 && revision > previous && !pendingMutationCount()) {
      await refreshAll({ quiet: true });
      showToast('妫€娴嬪埌鐢佃剳鏁版嵁宸叉洿鏂帮紝鐣岄潰宸插埛鏂?);
    }
  } catch (error) {
    console.warn('Revision polling failed', error);
  } finally {
    state.revisionPollInFlight = false;
  }
}


async function checkForServerRevisionChange({ force = false } = {}) {
  if (STANDALONE_MODE || !state.syncCode || state.revisionPollInFlight) return;
  if (!force && (document.hidden || !navigator.onLine)) return;

  state.revisionPollInFlight = true;
  try {
    const response = await fetch(`${API_ROOT}/sync/summary`, {
      headers: { 'X-Sync-Code': state.syncCode },
      cache: 'no-store'
    });
    if (!response.ok) return;
    const summary = await response.json();
    const revision = Number(summary.revision || 0);
    const previous = Number(state.serverRevision || 0);
    state.serverRevision = revision;

    if (previous > 0 && revision > previous && !pendingMutationCount()) {
      await refreshAll({ quiet: true });
      showToast('妫€娴嬪埌鐢佃剳鏁版嵁宸叉洿鏂帮紝鐣岄潰宸插埛鏂?);
    }
  } catch (error) {
    console.warn('Revision polling failed', error);
  } finally {
    state.revisionPollInFlight = false;
  }
}

function startServerRevisionPolling() {
  if (STANDALONE_MODE || state.revisionPollTimer) return;
  state.revisionPollTimer = setInterval(() => checkForServerRevisionChange(), REMOTE_REVISION_POLL_MS);
  window.addEventListener('focus', () => checkForServerRevisionChange({ force: true }));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkForServerRevisionChange({ force: true });
  });
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
    .map(([letter, values]) => `<option value="${escapeHtml(letter)}">${escapeHtml(letter)}锛?{values.total}锛?/option>`)
    .join('');
  for (const id of ['studySection', 'spellSection', 'wordSection']) {
    const select = $(`#${id}`);
    if (!select) continue;
    const current = select.value;
    select.innerHTML = `<option value="">鍏ㄩ儴瀛楁瘝</option>${options}`;
    if ([...select.options].some((option) => option.value === current)) select.value = current;
  }
}

function renderHome() {
  if (!state.stats) return;
  const s = state.stats;
  $('#heroCopy').textContent = `璇嶅簱鍏?${s.total} 璇嶏紝宸叉帉鎻?${s.known} 璇嶃€備粖澶╁厛瀹屾垚鏂拌瘝锛屽啀澶勭悊 ${s.due} 涓埌鏈熷涔犺瘝銆俙;
  $('#metricGrid').innerHTML = [
    ['璇嶅簱鎬婚噺', s.total, '瀹屾暣鍙绱?],
    ['鏈儗杩?, s.new, '浼樺厛瀛︿範'],
    ['寰呭珐鍥?, s.learning, '妯＄硦/杩橀渶澶嶄範'],
    ['鍒版湡澶嶄範', s.due, `閿欓 ${s.wrong} 涓猔]
  ].map(([label, value, hint]) => `<article class="metric-card"><span>${label}</span><strong>${value}</strong><em>${hint}</em></article>`).join('');

  const goal = Math.max(1, Number(s.dailyGoal || 45));
  const studied = Number(s.studiedToday || 0);
  const limited = s.dailyGoalEnabled === true;
  const pct = limited ? Math.min(100, Math.round((studied / goal) * 100)) : 0;
  $('#goalText').textContent = limited ? `${studied} / ${goal}` : `${studied} / 涓嶉檺`;
  $('#goalPercent').textContent = `${pct}%`;
  $('#goalRing').style.setProperty('--pct', pct);
  $('#streakCount').textContent = s.streak || 0;
  $('#dailyGoalInput').value = goal;
  const dailyGoalEnabled = $('#dailyGoalEnabled');
  if (dailyGoalEnabled) dailyGoalEnabled.checked = limited;

  const dayNames = ['鏃?, '涓€', '浜?, '涓?, '鍥?, '浜?, '鍏?];
  const days = state.daily?.days || {};
  const max = Math.max(1, ...Object.values(days).map((item) => Number(item.studied || 0)));
  $('#weekChart').innerHTML = Object.entries(days).map(([day, item]) => {
    const height = Math.max(5, Math.round((Number(item.studied || 0) / max) * 100));
    const isToday = day === state.daily.today;
    return `<div class="week-day ${isToday ? 'today' : ''}"><span>${item.studied || 0}</span><div class="bar-track"><i class="bar" style="height:${height}%"></i></div><small>鍛?{dayNames[new Date(`${day}T00:00:00`).getDay()]}</small></div>`;
  }).join('');

  $('#sectionGrid').innerHTML = Object.entries(state.sections)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, values]) => {
      const progress = values.total ? Math.round((values.known / values.total) * 100) : 0;
      return `<button class="section-button" type="button" data-study-section="${escapeHtml(letter)}"><strong>${escapeHtml(letter)}</strong><small>${values.total} 璇?/small><span class="mini-progress"><i style="width:${progress}%"></i></span></button>`;
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
const POS_SPLIT_RE = new RegExp(`(^|[\\s锛?锛?])(${POS_PATTERN})\\s*`, 'gi');

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
    const meaning = text.slice(start, end).replace(/^[\s锛?锛?銆?]+|[\s锛?锛?銆?]+$/g, '');
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
  if (senses.length > 1) groups.push(['璇嶆€ч噴涔?, senses.map((sense) => `${sense.pos ? `${sense.pos} ` : ''}${sense.meaning}`)]);
  if (word.synonyms.length) groups.push(['杩戜箟璇?, word.synonyms]);
  if (word.antonyms.length) groups.push(['鍙嶄箟璇?, word.antonyms]);
  if (word.proverbs.length) groups.push(['璋氳', word.proverbs]);
  if (word.forms.length) groups.push(['璇嶅舰涓庤娉?, word.forms]);
  if (word.collocations.length) groups.push(['甯哥敤鎼厤', word.collocations]);
  if (word.examples.length) groups.push(['渚嬪彞', word.examples]);
  return groups.map(([title, values]) => `<section class="detail-group"><strong>${title}</strong><ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul></section>`).join('');
}

function renderStudyCard() {
  const card = $('#studyCard');
  $('#studyQueueCount').textContent = `${state.studyQueue.length} 璇峘;
  if (!state.studyQueue.length || state.studyIndex >= state.studyQueue.length) {
    card.innerHTML = `<div class="empty-state"><span>馃帀</span><p>鏈疆瀛︿範瀹屾垚銆傞噸鏂扮敓鎴愰槦鍒楋紝鎴栧幓鍒版湡澶嶄範宸╁浐銆?/p><button class="primary-btn" type="button" data-restart-study>鍐嶆潵涓€杞?/button></div>`;
    $('[data-restart-study]')?.addEventListener('click', () => prepareStudyQueue(true));
    refreshStatsOnly();
    return;
  }

  state.ttsReady = true;
  state.ttsInitializing = false;
}

async function stopSpeaking() {
  // Stop Web Speech API
  try {
    window.speechSynthesis?.cancel?.();
  } catch (e) { /* ignore */ }

  // Stop native Android bridge
  try {
    if (window.VocabNative?.stopTts) window.VocabNative.stopTts();
  } catch (e) { /* ignore */ }

  // Stop Capacitor plugin
  try {
    const nativeTts = nativeTextToSpeech();
    if (nativeTts?.stop) await nativeTts.stop().catch(() => {});
  } catch (e) { /* ignore */ }

  // Cancel any pending callbacks
  for (const [id, resolver] of ttsCallbacks) {
    resolver('cancelled');
  }
  ttsCallbacks.clear();
}

function remoteTtsUrl(text, lang) {
  const encoded = encodeURIComponent(String(text || '').trim());
  const language = encodeURIComponent(lang || 'en-US');
  // Use Google Translate TTS - works in most contexts
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${language}&q=${encoded}`;
}

function renderReviewCard() {
  const card = $('#reviewCard');
  if (state.reviewIndex >= state.reviewQueue.length) {
    card.innerHTML = `<div class="empty-state"><span>馃幆</span><p>鏈疆澶嶄範瀹屾垚銆?/p><button class="primary-btn" type="button" data-review-finish>杩斿洖鍒版湡澶嶄範</button></div>`;
    $('[data-review-finish]')?.addEventListener('click', () => loadReviewCenter());
    refreshAll({ quiet: true });
    return;
  }
  const word = state.reviewQueue[state.reviewIndex];
  card.innerHTML = `
    <div class="review-front">
      <div>
        <h2>${escapeHtml(word.word)}</h2>
        <p>${escapeHtml(word.phonetic || word.pos || '鍏堝洖蹇嗕腑鏂囬噴涔?)}</p>
        <button class="speak-btn" type="button" data-speak-review aria-label="鏈楄鍗曡瘝">馃攰</button>
      </div>
    </div>
    ${state.reviewRevealed
      ? `<div class="answer-block">${wordMeaningHtml(word)}<div class="detail-groups">${wordDetailsHtml(word)}</div></div><div class="review-rating"><button class="rating-again" data-rating="again">閲嶆潵<br><small>10 鍒嗛挓</small></button><button class="rating-hard" data-rating="hard">鍥伴毦<br><small>1 澶?/small></button><button class="rating-good" data-rating="good">璁板緱<br><small>闂撮殧澧炲姞</small></button><button class="rating-easy" data-rating="easy">寰堢啛<br><small>鏇撮暱闂撮殧</small></button></div>`
      : '<button class="primary-btn" style="width:100%" type="button" data-reveal-review>鏄剧ず绛旀</button>'}
    <div class="card-footer"><span>${state.reviewIndex + 1} / ${state.reviewQueue.length}</span><span class="progress-track"><i style="width:${Math.round(((state.reviewIndex + 1) / state.reviewQueue.length) * 100)}%"></i></span><span>${state.reviewMode === 'wrong' ? '閿欓涓撶粌' : '闂撮殧澶嶄範'}</span></div>`;
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
  });
}

function renderWordList() {
  const words = getWordListFiltered();
  const pages = Math.max(1, Math.ceil(words.length / state.wordPageSize));
  state.wordPage = Math.min(pages, Math.max(1, state.wordPage));
  const start = (state.wordPage - 1) * state.wordPageSize;
  const pageWords = words.slice(start, start + state.wordPageSize);
  $('#wordCount').textContent = `${words.length} 璇峘;
  $('#wordTable').innerHTML = pageWords.length
    ? pageWords.map((word) => `<article class="word-row" data-word-detail="${escapeHtml(word.word)}"><div class="word-main"><strong>${escapeHtml(word.word)}</strong><small>${escapeHtml([`#${wordOrderValue(word)}`, word.phonetic, word.pos].filter(Boolean).join(' 路 '))}</small></div><div class="word-meaning">${escapeHtml(word.meaning)}</div><div class="word-actions"><button class="status-btn new ${word.status === 'new' ? 'active' : ''}" type="button" data-quick-status="new" data-word="${escapeHtml(word.word)}" title="鏈儗杩?>?</button><button class="status-btn learning ${word.status === 'learning' ? 'active' : ''}" type="button" data-quick-status="learning" data-word="${escapeHtml(word.word)}" title="寰呭珐鍥?>~</button><button class="status-btn known ${word.status === 'known' ? 'active' : ''}" type="button" data-quick-status="known" data-word="${escapeHtml(word.word)}" title="宸叉帉鎻?>鉁?/button></div></article>`).join('')
    : '<div class="empty-state"><span>鈱?/span><p>娌℃湁鎵惧埌鍖归厤鍗曡瘝銆?/p></div>';

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
  container.innerHTML = `<button type="button" data-page-number="${Math.max(1, state.wordPage - 1)}">鈥?/button>${numbers.map((page) => `<button type="button" class="${page === state.wordPage ? 'active' : ''}" data-page-number="${page}">${page}</button>`).join('')}<button type="button" data-page-number="${Math.min(pages, state.wordPage + 1)}">鈥?/button>`;
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

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to find a suitable voice
      const voices = window.speechSynthesis.getVoices?.() || [];
      const lowerLang = String(lang).toLowerCase();
      const voice = voices.find((v) => v.lang?.toLowerCase() === lowerLang)
        || voices.find((v) => v.lang?.toLowerCase().startsWith(lowerLang.slice(0, 2)))
        || null;
      if (voice) utterance.voice = voice;

async function renderDataPage() {
  $('#syncCodeInput').value = state.syncCode;
  const remoteInput = $('#remoteServerInput');
  if (remoteInput) remoteInput.value = state.remoteServer || localStorage.getItem(STORAGE.remoteServer) || '';
  try {
    const [summary, ip] = await Promise.all([api('/sync/summary'), api('/ip')]);
    state.serverRevision = Number(summary.revision || state.serverRevision || 0);
    const pending = pendingMutationCount();
    const remoteHint = STANDALONE_MODE ? `<br>鐢佃剳鍚屾鍦板潃锛?{escapeHtml(state.remoteServer || localStorage.getItem(STORAGE.remoteServer) || '鏈缃?)}` : '';
    $('#syncSummary').innerHTML = `鏈嶅姟鍣ㄤ慨璁㈢増锛?{summary.revision}<br>宸茶褰曪細${summary.progressCount} 璇?路 閿欓锛?{summary.wrongCount} 涓?br>鎵嬫満寰呬笂浼狅細${pending} 鏉?{remoteHint}<br>鏈€鍚庡悓姝ワ細${formatDate(summary.updatedAt)}<br>鏈€杩戣嚜鍔ㄥ浠斤細${formatDate(summary.latestBackupAt)}`;
    $('#syncStatusDot').classList.add('ok');
    $('#lanUrls').innerHTML = (ip.ips || []).map((address) => `<code>http://${escapeHtml(address)}:${ip.port}</code>`).join('');
  } catch {
    $('#syncSummary').textContent = `褰撳墠澶勪簬绂荤嚎妯″紡锛岃褰曚細鍏堜繚瀛樺湪鎵嬫満鏈湴锛涘緟涓婁紶 ${pendingMutationCount()} 鏉★紝鎭㈠杩炴帴鍚庝細鑷姩鍚屾銆俙;
    $('#syncStatusDot').classList.remove('ok');
  }
  $('#installSettingsButton').disabled = !state.deferredInstallPrompt;
}

      utterance.onend = () => finish(true);
      utterance.onerror = (e) => {
        console.warn('Web Speech error:', e);
        finish(false);
      };

      // Timeout - some WebView implementations never fire onend
      setTimeout(() => finish(false), 10000);

      window.speechSynthesis.speak(utterance);

      // Some WebView need a resume after cancel
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (err) {
      console.warn('Web Speech exception:', err);
      resolve(false);
    }
    const response = await fetch(`${API_ROOT}/progress/download`, { headers: { 'X-Sync-Code': state.syncCode } });
    if (!response.ok) throw new Error('瀵煎嚭澶辫触');
    const payload = await response.json();
    await saveJsonFile(`vocab-backup-${state.syncCode}.json`, payload);
  } catch (error) {
    showToast(error.message);
  }
}

function isNativeApp() {
  return globalThis.Capacitor?.isNativePlatform?.() === true || Boolean(window.VocabNative);
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
        showToast('璇烽€夋嫨淇濆瓨鐩綍骞剁‘璁ゆ枃浠跺悕');
        return;
      }
      if (result === 'SAVED_DOWNLOADS' || String(result).startsWith('SAVED_DOWNLOADS:')) {
        const savedPath = String(result).slice('SAVED_DOWNLOADS:'.length);
        showToast(savedPath ? `宸插鍑哄埌锛?{savedPath}` : `宸插鍑哄埌涓嬭浇鐩綍锛?{filename}`);
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
        title: '瀵煎嚭瀛︿範鏁版嵁',
        text: '璇烽€夋嫨淇濆瓨浣嶇疆鎴栧彂閫佸埌寰俊/鏂囦欢绠＄悊鍣ㄣ€?,
        url: result.uri,
        dialogTitle: '淇濆瓨瀛︿範鏁版嵁澶囦唤'
      }).catch(() => {});
    }

  if (isNativeApp()) {
    showToast('瀵煎嚭澶辫触锛欰PK 鍘熺敓淇濆瓨妯″潡鏈姞杞斤紝璇峰叧闂噸寮€搴旂敤鍚庨噸璇?);
    return;
  }

  if (isNativeApp()) {
    showToast('瀵煎嚭澶辫触锛欰PK 鍘熺敓淇濆瓨妯″潡鏈姞杞斤紝璇峰叧闂噸寮€搴旂敤鍚庨噸璇?);
    return;
  }

  if (isNativeApp()) {
    showToast('瀵煎嚭澶辫触锛欰PK 鍘熺敓淇濆瓨妯″潡鏈姞杞斤紝璇峰叧闂噸寮€搴旂敤鍚庨噸璇?);
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
  showToast(`宸茶Е鍙戞祻瑙堝櫒涓嬭浇锛?{filename}锛岃鍦ㄦ祻瑙堝櫒涓嬭浇璁板綍涓煡鐪媊);
}

// Main TTS function - tries multiple strategies in order
async function speakText(text, lang, rate = 0.82) {
  const cleanText = String(text || '').trim();
  if (!cleanText) return;

  // Strategy 1: Native Android bridge (VocabNative)
  if (hasNativeAndroidBridge()) {
    const nativeOk = await speakWithNativeBridge(cleanText, lang, rate);
    if (nativeOk) return;
  }



function nativeTextToSpeech() {
  return capacitorPlugin('TextToSpeech') || capacitorPlugin('TextToSpeechPlugin') || null;
}



// Native Android bridge with async callback support
function speakWithNativeBridge(text, lang, rate) {
  return new Promise((resolve) => {
    if (!hasNativeAndroidBridge()) {
      resolve(false);
      return;
    }

    try {
      if (typeof window.VocabNative.speakWithCallback === 'function') {
        const callbackId = String(++ttsCallbackId);
        const timeout = setTimeout(() => {
          ttsCallbacks.delete(callbackId);
          resolve(false);
        }, 30000);

        ttsCallbacks.set(callbackId, (result) => {
          clearTimeout(timeout);
          if (result === 'error' || result === 'NO_TTS_ENGINE') {
            resolve(false);
          } else {
            resolve(true);
          }
        });

        window.VocabNative.speakWithCallback(String(text || ''), lang, String(rate), callbackId);
      } else {
        const result = window.VocabNative.speak(String(text || ''), lang, String(rate));
        if (result === 'OK') {
          const estimatedMs = Math.min(15000, Math.max(1000, text.length * 150 + 500));
          setTimeout(() => resolve(true), estimatedMs);
        } else if (result === 'NO_TTS_ENGINE') {
          resolve(false);
        } else {
          resolve(false);
        }
      }
    } catch (err) {
      console.warn('Native bridge speak error:', err);
      resolve(false);
    }
  });
}
function canSpeakText() {

  return hasNativeAndroidBridge() || Boolean(nativeTextToSpeech()?.speak) || 'speechSynthesis' in window || isNativeApp();
}

async function stopSpeaking() {
  window.speechSynthesis?.cancel?.();
  if (window.VocabNative?.stopTts) window.VocabNative.stopTts();
  const nativeTts = nativeTextToSpeech();
  if (nativeTts?.stop) await nativeTts.stop().catch(() => {});
}


function remoteTtsUrl(text, lang) {
  const encoded = encodeURIComponent(String(text || '').trim());
  const language = encodeURIComponent(lang || 'en-US');
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${language}&q=${encoded}`;
}

function playRemoteTtsAudio(text, lang) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(remoteTtsUrl(text, lang));
    audio.preload = 'auto';
    audio.onended = resolve;
    audio.onerror = reject;
    audio.play().catch(reject);
  });
}

async function speakTextNative(text, lang, rate = 0.82) {
  if (hasNativeAndroidBridge()) {
    const result = window.VocabNative.speak(String(text || ''), lang, String(rate));
    if (result === 'OK') return true;
    if (result === 'NO_TTS_ENGINE') {
      const played = await playRemoteTtsAudio(text, lang).then(() => true).catch(() => false);
      if (played) return true;
    }
  }
  const nativeTts = nativeTextToSpeech();
  if (!nativeTts?.speak) {
    if (isNativeApp()) {
      const played = await playRemoteTtsAudio(text, lang).then(() => true).catch(() => false);
      if (played) return true;
    }
    return false;
  }
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

  // Strategy 3: Remote TTS audio (Google Translate)
  if (isNativeApp() || state.online) {
    try {
      await playRemoteTtsAudio(cleanText, lang);
      return;
    } catch (err) {
      console.warn('Remote TTS failed:', err);
    }
  }

function speakText(text, lang, rate = 0.82) {
  return new Promise((resolve) => {
    speakTextNative(text, lang, rate).then((handled) => {
      if (handled) { resolve(); return; }
      if (!('speechSynthesis' in window)) {
        showToast('褰撳墠璁惧鏆傛椂鏃犳硶鏈楄锛氳纭鎵嬫満绯荤粺宸插畨瑁呭苟鍚敤鏂囧瓧杞闊冲紩鎿?);
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
  if (!canSpeakText()) return showToast('褰撳墠璁惧鏆傛椂鏃犳硶鏈楄锛氳纭鎵嬫満绯荤粺宸插畨瑁呭苟鍚敤鏂囧瓧杞闊冲紩鎿?);
  await stopSpeaking();
  await speakText(word, 'en-US', 0.82);
}

function posToChinese(pos) {
  const normalized = String(pos || '').toLowerCase();
  const tokens = normalized.match(/modal\s*v|aux\.?\s*v|adj\.?|adv\.?|prep\.?|conj\.?|pron\.?|num\.?|art\.?|int\.?|vt\.?|vi\.?|v\.?|n\.?/g) || [];
  const labels = tokens.map((token) => {
    if (/modal|aux/.test(token)) return '鍔╁姩璇?;
    if (/^n/.test(token)) return '鍚嶈瘝';
    if (/^adj/.test(token)) return '褰㈠璇?;
    if (/^adv/.test(token)) return '鍓瘝';
    if (/^prep/.test(token)) return '浠嬭瘝';
    if (/^conj/.test(token)) return '杩炶瘝';
    if (/^pron/.test(token)) return '浠ｈ瘝';
    if (/^num/.test(token)) return '鏁拌瘝';
    if (/^art/.test(token)) return '鍐犺瘝';
    if (/^int/.test(token)) return '鎰熷徆璇?;
    if (/^vt/.test(token)) return '鍙婄墿鍔ㄨ瘝';
    if (/^vi/.test(token)) return '涓嶅強鐗╁姩璇?;
    if (/^v/.test(token)) return '鍔ㄨ瘝';
    return '';
  }).filter(Boolean);
  return [...new Set(labels)].join('銆?) || String(pos || '').trim();
}

function spokenMeaning(word) {
  return derivedSenses(word).map((sense) => `${sense.pos ? `${posToChinese(sense.pos)}锛宍 : ''}${sense.meaning}`).join('锛?) || word.meaning || '';
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
  // Speak the English word first
  await speakText(word.word, 'en-US', 0.82);
  // Brief pause between segments
  await delay(300);
  // Speak the Chinese meaning
  const meaning = spokenMeaning(word);
  if (meaning) {
    await speakText(meaning, 'zh-CN', 0.88);
    await delay(300);
  }
  // Speak the English example sentence
  const example = firstEnglishExample(word);
  if (example) {
    await speakText(example, 'en-US', 0.82);
  }
}

async function toggleAutoReadUnknown() {
  if (state.autoReadActive) {
    state.autoReadActive = false;
    await stopSpeaking();
    const btn = $('#autoReadUnknown');
    if (btn) btn.textContent = '杩炵画鏈楄鏈帉鎻＄殑鍗曡瘝';
    return;
  }
  if (!canSpeakText()) {
    showToast('褰撳墠璁惧鏆傛椂鏃犳硶鏈楄锛氳纭鎵嬫満绯荤粺宸插畨瑁呭苟鍚敤鏂囧瓧杞闊冲紩鎿?);
    return;
  }
  if (!canSpeakText()) return showToast('褰撳墠璁惧鏆傛椂鏃犳硶鏈楄锛氳纭鎵嬫満绯荤粺宸插畨瑁呭苟鍚敤鏂囧瓧杞闊冲紩鎿?);
  state.autoReadActive = true;
  const btn = $('#autoReadUnknown');
  if (btn) btn.textContent = '鍋滄鏈楄';
  const section = $('#studySection')?.value || '';
  const words = filteredWords(section, 'notknown').filter((word) => word.status === 'new' || word.status === 'learning');
  if (!words.length) {
    state.autoReadActive = false;
    if (btn) btn.textContent = '杩炵画鏈楄涓嶈璇?;
    showToast('褰撳墠娌℃湁涓嶈璇嗘垨妯＄硦鐨勫崟璇?);
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
    if (state.autoReadActive) await delay(1500);
  }
  state.autoReadActive = false;
  if (btn) btn.textContent = '杩炵画鏈楄鏈帉鎻＄殑鍗曡瘝';
}


async function installApp() {
  if (!state.deferredInstallPrompt) {
    showToast('璇蜂娇鐢ㄦ祻瑙堝櫒鑿滃崟涓殑"瀹夎搴旂敤/娣诲姞鍒颁富灞忓箷"');
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

  $('#wordSearch').addEventListener('input', () => renderWordTable());
  $('#wordSection').addEventListener('change', () => renderWordTable());
  $('#wordStatus').addEventListener('change', () => renderWordTable());

  $('#applySyncCode').addEventListener('click', applySyncCode);
  $('#copySyncCode').addEventListener('click', copySyncCode);
  $('#newSyncCode').addEventListener('click', generateNewSyncCode);
  $('#syncNow').addEventListener('click', syncNow);
  $('#saveRemoteServer').addEventListener('click', saveRemoteServer);
  $('#exportData').addEventListener('click', exportData);
  $('#importData').addEventListener('change', importData);
  $('#resetData').addEventListener('click', resetData);
  $('#installSettingsButton').addEventListener('click', installApp);
  $('#dailyGoalEnabled').addEventListener('change', (event) => saveDailyGoal({ enabled: event.target.checked }));
  $('#dailyGoalInput').addEventListener('change', (event) => saveDailyGoal({ goal: Number(event.target.value) }));
  $('#saveGoal').addEventListener('click', () => saveDailyGoal({}));

  document.querySelectorAll('[data-speak]').forEach((btn) => {
    btn.addEventListener('click', () => speakWord(btn.dataset.speak));
  });

  document.querySelectorAll('[data-dialog-speak]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wordEl = document.querySelector('#wordDialog [data-word]');
      if (wordEl) speakWord(wordEl.dataset.word);
    });
  });

  window.addEventListener('online', () => setConnectionStatus(true));
  window.addEventListener('offline', () => setConnectionStatus(false));
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    $('#installButton')?.classList.remove('hidden');
    $('#installSettingsButton').disabled = false;
  });

  document.addEventListener('click', (event) => {
    const speakBtn = event.target.closest('[data-speak]');
    if (speakBtn) {
      event.stopPropagation();
      speakWord(speakBtn.dataset.speak);
      return;
    }
    const dialogSpeakBtn = event.target.closest('[data-dialog-speak]');
    if (dialogSpeakBtn) {
      event.stopPropagation();
      const wordEl = document.querySelector('#wordDialogBody [data-word]');
      if (wordEl) speakWord(wordEl.dataset.word);
      return;
    }
    const wordRow = event.target.closest('[data-word-row]');
    if (wordRow) {
      openWordDialog(wordRow.dataset.wordRow);
    }
  });
}

// ===== Rendering functions =====

function switchPage(page) {
  state.page = page;
  $$('.page').forEach((section) => section.classList.remove('active'));
  $$('.nav-item').forEach((button) => button.classList.remove('active'));
  const target = $(`#page-${page}`);
  if (target) target.classList.add('active');
  const navBtn = document.querySelector(`[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');
  if (page === 'home') renderHome();
  if (page === 'study') prepareStudyQueue(false);
  if (page === 'review') prepareReviewQueue();
  if (page === 'spell') prepareSpellQueue(false);
  if (page === 'words') renderWordTable();
  if (page === 'data') renderDataPage();
}

function renderHome() {
  if (!state.stats) return;
  const grid = $('#metricGrid');
  if (!grid) return;
  const stats = state.stats;
  const items = [
    { label: '鎬昏瘝姹?, value: stats.total, icon: '馃摎' },
    { label: '宸叉帉鎻?, value: stats.known, icon: '鉁?, color: '#4caf50' },
    { label: '瀛︿範涓?, value: stats.learning, icon: '馃摉', color: '#ff9800' },
    { label: '寰呭涔?, value: stats.new, icon: '馃啎', color: '#2196f3' },
    { label: '寰呭涔?, value: stats.due, icon: '馃攧', color: '#9c27b0' },
    { label: '鏄撻敊璇?, value: stats.wrong, icon: '鈿狅笍', color: '#f44336' }
  ];
  grid.innerHTML = items.map((item) => `
    <div class="metric-card">
      <div class="metric-icon">${item.icon}</div>
      <div class="metric-value" style="${item.color ? `color:${item.color}` : ''}">${item.value}</div>
      <div class="metric-label">${item.label}</div>
    </div>
  `).join('');

  const goalRing = $('#goalRing');
  if (goalRing) {
    const percent = stats.dailyGoalEnabled ? Math.min(100, Math.round((stats.studiedToday / Math.max(1, stats.dailyGoal)) * 100)) : 0;
    $('#goalPercent').textContent = `${percent}%`;
    $('#goalText').textContent = `${stats.studiedToday} / ${stats.dailyGoal}`;
    const circumference = 2 * Math.PI * 52;
    goalRing.style.strokeDasharray = circumference;
    goalRing.style.strokeDashoffset = circumference * (1 - percent / 100);
  }

  const sectionGrid = $('#sectionGrid');
  if (sectionGrid && state.sections) {
    sectionGrid.innerHTML = Object.entries(state.sections).map(([section, data]) => `
      <div class="section-card">
        <div class="section-name">${escapeHtml(section)}</div>
        <div class="section-stats">
          <span class="badge badge-new">${data.new}</span>
          <span class="badge badge-learning">${data.learning}</span>
          <span class="badge badge-known">${data.known}</span>
          <span class="badge badge-due">${data.due}</span>
        </div>
      </div>
    `).join('');
  }
}

function renderStudyCard() {
  const card = $('#studyCard');
  if (!card) return;
  const word = state.studyQueue[state.studyIndex];
  if (!word) {
    card.innerHTML = '<div class="empty-state"><span>馃帀</span><p>鏈粍鍗曡瘝宸插涔犲畬姣曪紒</p></div>';
    return;
  }
  const showMeaning = state.studyRevealed || state.alwaysShowMeaning;
  card.innerHTML = `
    <div class="card-header">
      <span class="word-number">${state.studyIndex + 1} / ${state.studyQueue.length}</span>
      <span class="word-section">${escapeHtml(word.section || '')}</span>
    </div>
    <div class="word-display">
      <div class="word-text">${escapeHtml(word.word)}</div>
      ${word.phonetic ? `<div class="word-phonetic">/${escapeHtml(word.phonetic)}/</div>` : ''}
      <button class="speak-btn" type="button" data-speak="${escapeHtml(word.word)}" aria-label="鏈楄鍗曡瘝">馃攰</button>
    </div>
    ${showMeaning ? `
      <div class="word-meaning">${escapeHtml(word.meaning || '')}</div>
      ${word.senses?.length ? `<div class="word-senses">${word.senses.map((sense) => `<div class="sense"><span class="sense-pos">${escapeHtml(sense.pos || '')}</span><span class="sense-meaning">${escapeHtml(sense.meaning || '')}</span></div>`).join('')}</div>` : ''}
      ${word.examples?.length ? `<div class="word-examples">${word.examples.map((ex) => `<div class="example">${escapeHtml(ex)}</div>`).join('')}</div>` : ''}
    ` : '<div class="word-hint">鐐瑰嚮鍗＄墖鏌ョ湅閲婁箟</div>'}
    <div class="card-actions">
      <button class="action-btn btn-notknown" data-action="notknown">涓嶈璇?/button>
      <button class="action-btn btn-fuzzy" data-action="fuzzy">妯＄硦</button>
      <button class="action-btn btn-known" data-action="known">璁よ瘑</button>
    </div>
  `;
  card.querySelector('[data-action="notknown"]')?.addEventListener('click', () => markStudyWord('learning'));
  card.querySelector('[data-action="fuzzy"]')?.addEventListener('click', () => markStudyWord('learning'));
  card.querySelector('[data-action="known"]')?.addEventListener('click', () => markStudyWord('known'));
  card.querySelector('[data-speak]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    speakWord(word.word);
  });
  card.addEventListener('click', () => {
    if (!state.studyRevealed) {
      state.studyRevealed = true;
      renderStudyCard();
    }
  }, { once: true });
}

async function prepareStudyQueue(reload) {
  if (reload || !state.studyQueue.length) {
    const section = $('#studySection')?.value || '';
    const status = $('#studyStatus')?.value || 'notknown';
    const order = $('#studyOrder')?.value || 'sequence';
    let words = filteredWords(section, status);
    if (order === 'random') words = [...words].sort(() => Math.random() - 0.5);
    state.studyQueue = words;
    state.studyIndex = 0;
    state.studyRevealed = state.alwaysShowMeaning;
  }
  renderStudyCard();
}

async function markStudyWord(status) {
  const word = state.studyQueue[state.studyIndex];
  if (!word) return;
  try {
    if (isStandaloneMode()) {
      const profile = readStandaloneProfile();
      setStandaloneStatus(profile, word.word, status);
      writeStandaloneProfile(profile);
    } else {
      await apiFetch('/progress', { method: 'POST', body: { word: word.word, status } });
    }
    if (state.stats) {
      state.stats[word.status] = (state.stats[word.status] || 0) - 1;
      state.stats[status] = (state.stats[status] || 0) + 1;
    }
  } catch (error) {
    enqueueMutation('/progress', { method: 'POST', body: { word: word.word, status } });
  }
  state.studyIndex += 1;
  state.studyRevealed = state.alwaysShowMeaning;
  renderStudyCard();
}

function prepareReviewQueue() {
  // Load review queue
  if (state.reviewQueue.length) return;
  apiFetch('/review-queue').then((data) => {
    state.reviewQueue = data.words || [];
    state.reviewIndex = 0;
    renderReviewCard();
  }).catch(() => {
    // Fallback: use local words
    state.reviewQueue = state.words.filter((w) => w.isDue);
    state.reviewIndex = 0;
    renderReviewCard();
  });
}

function renderReviewCard() {
  const card = $('#reviewCard');
  const summary = $('#reviewSummaryNumber');
  if (!card) return;
  const word = state.reviewQueue[state.reviewIndex];
  if (!word) {
    card.innerHTML = '<div class="empty-state"><span>馃帀</span><p>澶嶄範瀹屾垚锛?/p></div>';
    if (summary) summary.textContent = '0';
    return;
  }
  if (summary) summary.textContent = String(state.reviewQueue.length - state.reviewIndex);
  state.reviewRevealed = false;
  card.innerHTML = `
    <div class="card-header">
      <span class="word-number">${state.reviewIndex + 1} / ${state.reviewQueue.length}</span>
      <span class="word-section">${escapeHtml(word.section || '')}</span>
    </div>
    <div class="word-display">
      <div class="word-text">${escapeHtml(word.word)}</div>
      ${word.phonetic ? `<div class="word-phonetic">/${escapeHtml(word.phonetic)}/</div>` : ''}
      <button class="speak-btn" type="button" data-speak-review aria-label="鏈楄鍗曡瘝">馃攰</button>
    </div>
    <div class="word-meaning hidden" id="reviewMeaning">${escapeHtml(word.meaning || '')}</div>
    <div class="card-actions">
      <button class="action-btn btn-again" data-rating="again">鍐嶆潵</button>
      <button class="action-btn btn-hard" data-rating="hard">鍥伴毦</button>
      <button class="action-btn btn-easy" data-rating="easy">绠€鍗?/button>
    </div>
  `;
  card.querySelector('[data-speak-review]')?.addEventListener('click', () => speakWord(word.word));
  card.querySelector('[data-rating="again"]')?.addEventListener('click', () => reviewWord('again'));
  card.querySelector('[data-rating="hard"]')?.addEventListener('click', () => reviewWord('hard'));
  card.querySelector('[data-rating="easy"]')?.addEventListener('click', () => reviewWord('easy'));
  card.addEventListener('click', () => {
    $('#reviewMeaning')?.classList.toggle('hidden');
  }, { once: true });
}

async function reviewWord(rating) {
  const word = state.reviewQueue[state.reviewIndex];
  if (!word) return;
  try {
    if (isStandaloneMode()) {
      const profile = readStandaloneProfile();
      reviewStandaloneWord(profile, word.word, rating);
      writeStandaloneProfile(profile);
    } else {
      await apiFetch('/review', { method: 'POST', body: { word: word.word, rating } });
    }
  } catch (error) {
    enqueueMutation('/review', { method: 'POST', body: { word: word.word, rating } });
  }
  state.reviewIndex += 1;
  renderReviewCard();
}

async function loadWrongReview() {
  try {
    const data = await apiFetch('/wrong-words');
    state.reviewQueue = data.words || [];
    state.reviewIndex = 0;
    renderReviewCard();
  } catch (error) {
    showToast('鍔犺浇閿欒瘝澶辫触');
  }
}

function startReview() {
  prepareReviewQueue();
}

function prepareSpellQueue(reload) {
  if (reload || !state.spellQueue.length) {
    const section = $('#spellSection')?.value || '';
    const status = $('#spellStatus')?.value || 'notknown';
    let words = filteredWords(section, status);
    state.spellQueue = [...words].sort(() => Math.random() - 0.5);
    state.spellIndex = 0;
    state.spellAnswered = false;
  }
  renderSpellCard();
}

function renderSpellCard() {
  const card = $('#spellCard');
  if (!card) return;
  const word = state.spellQueue[state.spellIndex];
  if (!word) {
    card.innerHTML = '<div class="empty-state"><span>馃帀</span><p>鎷煎啓缁冧範瀹屾垚锛?/p></div>';
    return;
  }
  const counter = $('#spellCounter');
  if (counter) counter.textContent = `${state.spellIndex + 1} / ${state.spellQueue.length}`;
  card.innerHTML = `
    <div class="spell-meaning">${escapeHtml(word.meaning || '')}</div>
    <input type="text" class="spell-input" id="spellInput" placeholder="杈撳叆鍗曡瘝鎷煎啓" autocomplete="off" autocapitalize="none" spellcheck="false">
    <button class="primary-btn" id="spellSubmit">纭</button>
    <div class="spell-result hidden" id="spellResult"></div>
  `;
  const input = $('#spellInput');
  const submit = $('#spellSubmit');
  const result = $('#spellResult');
  const check = () => {
    if (state.spellAnswered) return;
    state.spellAnswered = true;
    const answer = input.value.trim().toLowerCase();
    const correct = word.word.toLowerCase();
    if (answer === correct) {
      result.textContent = `鉁?姝ｇ‘锛?{escapeHtml(word.word)}`;
      result.className = 'spell-result correct';
    } else {
      result.textContent = `鉂?閿欒锛佹纭瓟妗堬細${escapeHtml(word.word)}`;
      result.className = 'spell-result wrong';
    }
    result.classList.remove('hidden');
    speakWord(word.word);
    setTimeout(() => {
      state.spellIndex += 1;
      state.spellAnswered = false;
      renderSpellCard();
    }, 2500);
  };
  submit.addEventListener('click', check);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
  input.focus();
}

function renderWordTable() {
  const table = $('#wordTable');
  if (!table) return;
  const search = $('#wordSearch')?.value.toLowerCase() || '';
  const section = $('#wordSection')?.value || '';
  const status = $('#wordStatus')?.value || 'all';
  let words = state.words;
  if (search) words = words.filter((w) => w.word.toLowerCase().includes(search) || (w.meaning || '').toLowerCase().includes(search));
  if (section) words = words.filter((w) => w.section === section);
  if (status !== 'all') {
    if (status === 'notknown') words = words.filter((w) => w.status === 'new' || w.status === 'learning');
    else words = words.filter((w) => w.status === status);
  }
  const totalPages = Math.ceil(words.length / state.wordPageSize);
  if (state.wordPage > totalPages) state.wordPage = 1;
  const start = (state.wordPage - 1) * state.wordPageSize;
  const pageWords = words.slice(start, start + state.wordPageSize);
  table.innerHTML = `
    <table>
      <thead>
        <tr><th>#</th><th>鍗曡瘝</th><th>閲婁箟</th><th>鐘舵€?/th><th></th></tr>
      </thead>
      <tbody>
        ${pageWords.map((word, i) => `
          <tr data-word-row="${escapeHtml(word.word)}">
            <td>${start + i + 1}</td>
            <td class="word-col">
              <span class="word-cell">${escapeHtml(word.word)}</span>
              ${word.phonetic ? `<span class="phonetic-cell">/${escapeHtml(word.phonetic)}/</span>` : ''}
            </td>
            <td class="meaning-col">${escapeHtml(word.meaning || '')}</td>
            <td><span class="tag tag-${word.status || 'new'}">${statusLabel(word.status)}</span></td>
            <td><button class="speak-btn" type="button" data-speak="${escapeHtml(word.word)}" aria-label="鏈楄">馃攰</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  const pagination = $('#wordPagination');
  if (pagination) {
    pagination.innerHTML = totalPages > 1 ? Array.from({ length: totalPages }, (_, i) => `
      <button class="page-btn ${i + 1 === state.wordPage ? 'active' : ''}" data-page="${i + 1}">${i + 1}</button>
    `).join('') : '';
    pagination.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => { state.wordPage = Number(btn.dataset.page); renderWordTable(); });
    });
  }
  $('#wordCount').textContent = `${words.length} 璇峘;
}

function openWordDialog(wordText) {
  const word = state.words.find((w) => w.word === wordText);
  if (!word) return;
  const dialog = $('#wordDialog');
  const body = $('#wordDialogBody');
  if (!dialog || !body) return;
  body.innerHTML = `
    <div class="dialog-header">
      <div>
        <div class="dialog-word" data-word="${escapeHtml(word.word)}">${escapeHtml(word.word)}</div>
        ${word.phonetic ? `<div class="dialog-phonetic">/${escapeHtml(word.phonetic)}/</div>` : ''}
      </div>
      <span class="tag tag-${word.status || 'new'}">${statusLabel(word.status)}</span>
      <button class="speak-btn" type="button" data-dialog-speak aria-label="鏈楄鍗曡瘝">馃攰</button>
    </div>
    <div class="dialog-meaning">${escapeHtml(word.meaning || '')}</div>
    ${word.senses?.length ? `<div class="dialog-senses">${word.senses.map((s) => `<div class="sense"><span class="sense-pos">${escapeHtml(s.pos || '')}</span><span class="sense-meaning">${escapeHtml(s.meaning || '')}</span></div>`).join('')}</div>` : ''}
    ${word.examples?.length ? `<div class="dialog-examples">${word.examples.map((ex) => `<div class="example">${escapeHtml(ex)}</div>`).join('')}</div>` : ''}
  `;
  dialog.showModal?.() || dialog.classList.add('show');
  body.querySelector('[data-dialog-speak]')?.addEventListener('click', () => speakWord(word.word));
}

function renderDataPage() {
  const summary = $('#syncSummary');
  if (!summary) return;
  apiFetch('/sync/summary').then((data) => {
    summary.innerHTML = `
      <div class="sync-row">鍚屾鐮侊細<strong>${escapeHtml(data.syncCode || state.syncCode)}</strong></div>
      <div class="sync-row">鐗堟湰锛?strong>${data.revision || 0}</strong></div>
      <div class="sync-row">鏈€鍚庢洿鏂帮細<strong>${data.updatedAt ? new Date(data.updatedAt).toLocaleString('zh-CN') : '浠庢湭'}</strong></div>
      <div class="sync-row">宸茶褰曡繘搴︼細<strong>${data.progressCount || 0} 璇?/strong></div>
      <div class="sync-row">閿欒瘝鏈細<strong>${data.wrongCount || 0} 璇?/strong></div>
    `;
  }).catch(() => {
    summary.innerHTML = '<div class="sync-row muted">鏃犳硶鑾峰彇鍚屾淇℃伅</div>';
  });
}

async function applySyncCode() {
  const input = $('#syncCodeInput');
  const code = normalizeSyncCode(input?.value);
  if (!code) return showToast('璇疯緭鍏ユ湁鏁堢殑鍚屾鐮?);
  state.syncCode = code;
  writeJsonStorage(STORAGE.syncCode, code);
  await loadData();
  showToast('鍚屾鐮佸凡搴旂敤');
}

function copySyncCode() {
  const code = state.syncCode;
  if (!code) return;
  navigator.clipboard?.writeText(code).then(() => showToast('宸插鍒跺悓姝ョ爜')).catch(() => {});
}

function generateNewSyncCode() {
  const code = generateSyncCode();
  state.syncCode = code;
  writeJsonStorage(STORAGE.syncCode, code);
  $('#syncCodeInput').value = code;
  showToast('宸茬敓鎴愭柊鍚屾鐮?);
}

async function syncNow() {
  if (!state.syncCode) return showToast('璇峰厛璁剧疆鍚屾鐮?);
  showToast('鍚屾涓?..');
  try {
    const profile = readStandaloneProfile();
    await apiFetch('/sync/push', { method: 'POST', body: { profile } });
    const pullData = await apiFetch('/sync/pull', { method: 'POST' });
    if (pullData?.profile) {
      const merged = mergeStandaloneProfile(readStandaloneProfile(), coerceStandaloneProfile(pullData.profile));
      writeStandaloneProfile(merged);
    }
    showToast('鍚屾瀹屾垚');
    await loadData();
  } catch (error) {
    showToast('鍚屾澶辫触锛? + error.message);
  }
}

function saveRemoteServer() {
  const input = $('#remoteServerInput');
  const value = normalizeRemoteServer(input?.value);
  state.remoteServer = value;
  writeJsonStorage(STORAGE.remoteServer, value);
  showToast('鏈嶅姟鍣ㄥ湴鍧€宸蹭繚瀛?);
}

function saveDailyGoal(changes) {
  const profile = readStandaloneProfile();
  if (!profile.settings) profile.settings = { dailyGoal: 45, dailyGoalEnabled: false };
  if (changes.enabled !== undefined) profile.settings.dailyGoalEnabled = changes.enabled;
  if (changes.goal !== undefined) profile.settings.dailyGoal = changes.goal;
  writeStandaloneProfile(profile);
  showToast('鐩爣宸蹭繚瀛?);
}

async function exportData() {
  const profile = readStandaloneProfile();
  const data = { profile, words: state.words, exportedAt: new Date().toISOString() };
  const json = JSON.stringify(data, null, 2);
  if (window.VocabNative?.saveJson) {
    const result = window.VocabNative.saveJson(`vocab-backup-${Date.now()}.json`, json);
    if (result === 'OPENED') showToast('璇烽€夋嫨淇濆瓨鐩綍骞剁‘璁ゆ枃浠跺悕');
    else if (result?.startsWith?.('SAVED_DOWNLOADS')) showToast('鏁版嵁宸插鍑?);
    else showToast('瀵煎嚭澶辫触');
  } else {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocab-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('鏁版嵁宸插鍑?);
  }
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.profile) {
        const merged = mergeStandaloneProfile(readStandaloneProfile(), coerceStandaloneProfile(data.profile));
        writeStandaloneProfile(merged);
        showToast('鏁版嵁宸插鍏?);
        loadData();
      } else {
        showToast('鏂囦欢鏍煎紡涓嶆纭?);
      }
    } catch (error) {
      showToast('瀵煎叆澶辫触锛? + error.message);
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm('纭畾瑕侀噸缃墍鏈夊涔犳暟鎹悧锛熸鎿嶄綔涓嶅彲鎾ら攢銆?)) return;
  const key = standaloneProfileKey();
  localStorage.removeItem(key);
  localStorage.removeItem(STORAGE.standaloneWords);
  showToast('鏁版嵁宸查噸缃?);
  loadData();
}

async function loadData() {
  try {
    if (isStandaloneMode()) {
      const words = await loadStandaloneWords();
      const profile = readStandaloneProfile();
      state.words = words.map((word) => decorateStandaloneWord(profile, word));
      state.stats = calculateStandaloneStats(profile, words);
      const sections = {};
      for (const word of state.words) {
        sections[word.section] ||= { total: 0, new: 0, learning: 0, known: 0, due: 0 };
        sections[word.section].total += 1;
        sections[word.section][word.status] += 1;
        if (word.isDue) sections[word.section].due += 1;
      }
      state.sections = sections;
      renderHome();
    } else {
      const [wordsData, statsData, sectionsData] = await Promise.all([
        apiFetch('/words'),
        apiFetch('/stats'),
        apiFetch('/sections')
      ]);
      state.words = wordsData.words || [];
      state.stats = statsData;
      state.sections = sectionsData;
      renderHome();
    }
    populateSectionSelects();
  } catch (error) {
    showToast('鍔犺浇鏁版嵁澶辫触锛? + error.message);
  }
}

function populateSectionSelects() {
  const sections = Object.keys(state.sections || {}).sort();
  const selects = [$('#studySection'), $('#spellSection'), $('#wordSection')];
  for (const select of selects) {
    if (!select) continue;
    const current = select.value;
    select.innerHTML = '<option value="">鍏ㄩ儴绔犺妭</option>' + sections.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    select.value = current;
  }
}

async function init() {
  state.syncCode = readJsonStorage(STORAGE.syncCode, '');
  state.remoteServer = readJsonStorage(STORAGE.remoteServer, '');
  state.alwaysShowMeaning = readJsonStorage(STORAGE.alwaysShowMeaning, false);

  if ('serviceWorker' in navigator && STANDALONE_MODE) {
    navigator.serviceWorker.getRegistrations?.().then((registrations) => registrations.forEach((registration) => registration.unregister())).catch(() => {});
    globalThis.caches?.keys?.().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).catch(() => {});
  } else if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('Service worker registration failed:', error));
  }

  await refreshAll();
  await flushPendingMutations();
  await checkForServerRevisionChange({ force: true });
  startServerRevisionPolling();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
