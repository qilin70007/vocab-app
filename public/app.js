'use strict';

const API_ROOT = '/api';
const STANDALONE_MODE = new URLSearchParams(location.search).get('standalone') === '1'
  || globalThis.VOCAB_STANDALONE === true
  || globalThis.Capacitor?.isNativePlatform?.() === true;
const REMOTE_REVISION_POLL_MS = 15_000;

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
  revisionPollInFlight: false,
  ttsReady: false,
  ttsInitializing: false
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
  const text = label || (online ? '已连接' : '离线模式');
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
  setConnectionStatus(false, '离线已保存');
}


async function loadStandaloneWords() {
  const cached = readJsonStorage(STORAGE.standaloneWords, null);
  if (cached?.length) return cached;
  const response = await fetch('/words.json');
  if (!response.ok) throw new Error('无法加载离线单词数据');
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
  if (!base) throw new Error('离线模式：无法连接服务器');
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
  return { new: '生词', learning: '模糊', known: '掌握', notknown: '不认识' }[status] || status || '';
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

function hasNativeAndroidBridge() {
  return Boolean(window.VocabNative && typeof window.VocabNative.speak === 'function');
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

  // Warm up Web Speech API voices
  if ('speechSynthesis' in window) {
    try {
      // Trigger voice loading
      window.speechSynthesis.getVoices();
      // Some browsers need onvoiceschanged to populate
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    } catch (e) {
      console.warn('Web Speech API init failed:', e);
    }
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

function playRemoteTtsAudio(text, lang) {
  return new Promise((resolve, reject) => {
    try {
      const url = remoteTtsUrl(text, lang);
      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audio.onended = () => resolve(true);
      audio.onerror = (e) => {
        console.warn('Remote TTS audio error:', e);
        reject(new Error('Audio playback failed'));
      };
      // Set a timeout in case audio hangs
      const timeout = setTimeout(() => {
        audio.pause();
        reject(new Error('Audio timeout'));
      }, 15000);
      audio.onended = () => { clearTimeout(timeout); resolve(true); };
      audio.onerror = () => { clearTimeout(timeout); reject(new Error('Audio error')); };
      audio.play().catch((err) => {
        clearTimeout(timeout);
        console.warn('Remote TTS play() failed:', err);
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

// Try to use Web Speech API (works in browser, may work in some WebViews)
function speakWithWebSpeech(text, lang, rate) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve(false);
      return;
    }
    try {
      // Cancel any ongoing speech first
      window.speechSynthesis.cancel();

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

      let resolved = false;
      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        resolve(result);
      };

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
  });
}

// Native Android bridge with async callback support
function speakWithNativeBridge(text, lang, rate) {
  return new Promise((resolve) => {
    if (!hasNativeAndroidBridge()) {
      resolve(false);
      return;
    }

    try {
      // Check if the bridge supports async callback (newer version)
      if (typeof window.VocabNative.speakWithCallback === 'function') {
        const callbackId = String(++ttsCallbackId);
        const timeout = setTimeout(() => {
          ttsCallbacks.delete(callbackId);
          // Fallback: assume it didn't work
          resolve(false);
        }, 30000); // 30s timeout for long text

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
        // Fallback to old synchronous speak() method
        const result = window.VocabNative.speak(String(text || ''), lang, String(rate));
        if (result === 'OK') {
          // Speech was queued successfully. Wait a bit for it to start,
          // then resolve. The actual completion isn't tracked in the old API.
          // Estimate duration: ~150ms per character + 500ms base
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

// Main TTS function - tries multiple strategies in order
async function speakText(text, lang, rate = 0.82) {
  const cleanText = String(text || '').trim();
  if (!cleanText) return;

  // Strategy 1: Native Android bridge (VocabNative)
  if (hasNativeAndroidBridge()) {
    const nativeOk = await speakWithNativeBridge(cleanText, lang, rate);
    if (nativeOk) return;
  }

  // Strategy 2: Web Speech API
  if ('speechSynthesis' in window) {
    const webOk = await speakWithWebSpeech(cleanText, lang, rate);
    if (webOk) return;
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

  // All strategies failed
  console.warn('All TTS strategies failed for:', cleanText);
}

async function speakWord(word) {
  if (!canSpeakText()) {
    showToast('当前设备暂时无法朗读：请确认手机系统已安装并启用文字转语音引擎');
    return;
  }
  await stopSpeaking();
  await speakText(word, 'en-US', 0.82);
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
    if (btn) btn.textContent = '连续朗读未掌握的单词';
    return;
  }
  if (!canSpeakText()) {
    showToast('当前设备暂时无法朗读：请确认手机系统已安装并启用文字转语音引擎');
    return;
  }
  state.autoReadActive = true;
  const btn = $('#autoReadUnknown');
  if (btn) btn.textContent = '停止朗读';
  const section = $('#studySection')?.value || '';
  const words = filteredWords(section, 'notknown').filter((word) => word.status === 'new' || word.status === 'learning');
  if (!words.length) {
    state.autoReadActive = false;
    if (btn) btn.textContent = '连续朗读不认识';
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
    if (state.autoReadActive) await delay(1500);
  }
  state.autoReadActive = false;
  if (btn) btn.textContent = '连续朗读未掌握的单词';
}


async function installApp() {
  if (!state.deferredInstallPrompt) {
    showToast('请使用浏览器菜单中的"安装应用/添加到主屏幕"');
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
    { label: '总词汇', value: stats.total, icon: '📚' },
    { label: '已掌握', value: stats.known, icon: '✅', color: '#4caf50' },
    { label: '学习中', value: stats.learning, icon: '📖', color: '#ff9800' },
    { label: '待学习', value: stats.new, icon: '🆕', color: '#2196f3' },
    { label: '待复习', value: stats.due, icon: '🔄', color: '#9c27b0' },
    { label: '易错词', value: stats.wrong, icon: '⚠️', color: '#f44336' }
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
    card.innerHTML = '<div class="empty-state"><span>🎉</span><p>本组单词已学习完毕！</p></div>';
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
      <button class="speak-btn" type="button" data-speak="${escapeHtml(word.word)}" aria-label="朗读单词">🔊</button>
    </div>
    ${showMeaning ? `
      <div class="word-meaning">${escapeHtml(word.meaning || '')}</div>
      ${word.senses?.length ? `<div class="word-senses">${word.senses.map((sense) => `<div class="sense"><span class="sense-pos">${escapeHtml(sense.pos || '')}</span><span class="sense-meaning">${escapeHtml(sense.meaning || '')}</span></div>`).join('')}</div>` : ''}
      ${word.examples?.length ? `<div class="word-examples">${word.examples.map((ex) => `<div class="example">${escapeHtml(ex)}</div>`).join('')}</div>` : ''}
    ` : '<div class="word-hint">点击卡片查看释义</div>'}
    <div class="card-actions">
      <button class="action-btn btn-notknown" data-action="notknown">不认识</button>
      <button class="action-btn btn-fuzzy" data-action="fuzzy">模糊</button>
      <button class="action-btn btn-known" data-action="known">认识</button>
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
    card.innerHTML = '<div class="empty-state"><span>🎉</span><p>复习完成！</p></div>';
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
      <button class="speak-btn" type="button" data-speak-review aria-label="朗读单词">🔊</button>
    </div>
    <div class="word-meaning hidden" id="reviewMeaning">${escapeHtml(word.meaning || '')}</div>
    <div class="card-actions">
      <button class="action-btn btn-again" data-rating="again">再来</button>
      <button class="action-btn btn-hard" data-rating="hard">困难</button>
      <button class="action-btn btn-easy" data-rating="easy">简单</button>
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
    showToast('加载错词失败');
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
    card.innerHTML = '<div class="empty-state"><span>🎉</span><p>拼写练习完成！</p></div>';
    return;
  }
  const counter = $('#spellCounter');
  if (counter) counter.textContent = `${state.spellIndex + 1} / ${state.spellQueue.length}`;
  card.innerHTML = `
    <div class="spell-meaning">${escapeHtml(word.meaning || '')}</div>
    <input type="text" class="spell-input" id="spellInput" placeholder="输入单词拼写" autocomplete="off" autocapitalize="none" spellcheck="false">
    <button class="primary-btn" id="spellSubmit">确认</button>
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
      result.textContent = `✅ 正确！${escapeHtml(word.word)}`;
      result.className = 'spell-result correct';
    } else {
      result.textContent = `❌ 错误！正确答案：${escapeHtml(word.word)}`;
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
        <tr><th>#</th><th>单词</th><th>释义</th><th>状态</th><th></th></tr>
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
            <td><button class="speak-btn" type="button" data-speak="${escapeHtml(word.word)}" aria-label="朗读">🔊</button></td>
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
  $('#wordCount').textContent = `${words.length} 词`;
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
      <button class="speak-btn" type="button" data-dialog-speak aria-label="朗读单词">🔊</button>
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
      <div class="sync-row">同步码：<strong>${escapeHtml(data.syncCode || state.syncCode)}</strong></div>
      <div class="sync-row">版本：<strong>${data.revision || 0}</strong></div>
      <div class="sync-row">最后更新：<strong>${data.updatedAt ? new Date(data.updatedAt).toLocaleString('zh-CN') : '从未'}</strong></div>
      <div class="sync-row">已记录进度：<strong>${data.progressCount || 0} 词</strong></div>
      <div class="sync-row">错词本：<strong>${data.wrongCount || 0} 词</strong></div>
    `;
  }).catch(() => {
    summary.innerHTML = '<div class="sync-row muted">无法获取同步信息</div>';
  });
}

async function applySyncCode() {
  const input = $('#syncCodeInput');
  const code = normalizeSyncCode(input?.value);
  if (!code) return showToast('请输入有效的同步码');
  state.syncCode = code;
  writeJsonStorage(STORAGE.syncCode, code);
  await loadData();
  showToast('同步码已应用');
}

function copySyncCode() {
  const code = state.syncCode;
  if (!code) return;
  navigator.clipboard?.writeText(code).then(() => showToast('已复制同步码')).catch(() => {});
}

function generateNewSyncCode() {
  const code = generateSyncCode();
  state.syncCode = code;
  writeJsonStorage(STORAGE.syncCode, code);
  $('#syncCodeInput').value = code;
  showToast('已生成新同步码');
}

async function syncNow() {
  if (!state.syncCode) return showToast('请先设置同步码');
  showToast('同步中...');
  try {
    const profile = readStandaloneProfile();
    await apiFetch('/sync/push', { method: 'POST', body: { profile } });
    const pullData = await apiFetch('/sync/pull', { method: 'POST' });
    if (pullData?.profile) {
      const merged = mergeStandaloneProfile(readStandaloneProfile(), coerceStandaloneProfile(pullData.profile));
      writeStandaloneProfile(merged);
    }
    showToast('同步完成');
    await loadData();
  } catch (error) {
    showToast('同步失败：' + error.message);
  }
}

function saveRemoteServer() {
  const input = $('#remoteServerInput');
  const value = normalizeRemoteServer(input?.value);
  state.remoteServer = value;
  writeJsonStorage(STORAGE.remoteServer, value);
  showToast('服务器地址已保存');
}

function saveDailyGoal(changes) {
  const profile = readStandaloneProfile();
  if (!profile.settings) profile.settings = { dailyGoal: 45, dailyGoalEnabled: false };
  if (changes.enabled !== undefined) profile.settings.dailyGoalEnabled = changes.enabled;
  if (changes.goal !== undefined) profile.settings.dailyGoal = changes.goal;
  writeStandaloneProfile(profile);
  showToast('目标已保存');
}

async function exportData() {
  const profile = readStandaloneProfile();
  const data = { profile, words: state.words, exportedAt: new Date().toISOString() };
  const json = JSON.stringify(data, null, 2);
  if (window.VocabNative?.saveJson) {
    const result = window.VocabNative.saveJson(`vocab-backup-${Date.now()}.json`, json);
    if (result === 'OPENED') showToast('请选择保存目录并确认文件名');
    else if (result?.startsWith?.('SAVED_DOWNLOADS')) showToast('数据已导出');
    else showToast('导出失败');
  } else {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocab-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据已导出');
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
        showToast('数据已导入');
        loadData();
      } else {
        showToast('文件格式不正确');
      }
    } catch (error) {
      showToast('导入失败：' + error.message);
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm('确定要重置所有学习数据吗？此操作不可撤销。')) return;
  const key = standaloneProfileKey();
  localStorage.removeItem(key);
  localStorage.removeItem(STORAGE.standaloneWords);
  showToast('数据已重置');
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
    showToast('加载数据失败：' + error.message);
  }
}

function populateSectionSelects() {
  const sections = Object.keys(state.sections || {}).sort();
  const selects = [$('#studySection'), $('#spellSection'), $('#wordSection')];
  for (const select of selects) {
    if (!select) continue;
    const current = select.value;
    select.innerHTML = '<option value="">全部章节</option>' + sections.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    select.value = current;
  }
}

async function init() {
  state.syncCode = readJsonStorage(STORAGE.syncCode, '');
  state.remoteServer = readJsonStorage(STORAGE.remoteServer, '');
  state.alwaysShowMeaning = readJsonStorage(STORAGE.alwaysShowMeaning, false);

  if (state.syncCode) {
    $('#syncCodeInput').value = state.syncCode;
  }
  if (state.remoteServer) {
    const input = $('#remoteServerInput');
    if (input) input.value = state.remoteServer;
  }

  bindEvents();
  setConnectionStatus(navigator.onLine);

  // Initialize TTS engine early
  initTts();

  await loadData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
