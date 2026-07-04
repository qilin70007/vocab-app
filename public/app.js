'use strict';

const API_ROOT = '/api';
const STORAGE = {
  syncCode: 'vocab.v2.syncCode',
  pending: 'vocab.v2.pendingMutations',
  cachePrefix: 'vocab.v2.3.1.cache.',
  alwaysShowMeaning: 'vocab.v2.alwaysShowMeaning'
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
  alwaysShowMeaning: readJsonStorage(STORAGE.alwaysShowMeaning, false)
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

function setConnectionStatus(online, label) {
  state.online = online;
  const pill = $('#connectionPill');
  if (!pill) return;
  pill.classList.toggle('online', online);
  pill.classList.toggle('offline', !online);
  pill.querySelector('span').textContent = label || (online ? '已同步' : '离线模式');
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
}

async function api(path, options = {}, config = {}) {
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
    showToast('离线记录已同步');
    await refreshAll({ quiet: true });
  }
}

let toastTimer = null;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
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
  for (const key of ['forms', 'collocations', 'examples', 'synonyms', 'antonyms', 'proverbs', 'senses']) {
    if (!Array.isArray(word[key])) word[key] = word[key] ? [String(word[key])] : [];
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
  const limited = s.dailyGoalEnabled !== false;
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
  const shouldLimit = status === 'notknown' && state.stats?.dailyGoalEnabled !== false;
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
  const sourceWord = state.words.find((item) => item.word === word.word);
  if (sourceWord) sourceWord.status = status;
  state.studyIndex += 1;
  state.studyRevealed = state.alwaysShowMeaning;
  renderStudyCard();
  try {
    await api(`/words/${encodeURIComponent(word.word)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }, { queueable: true });
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
  renderReviewCard();
  try {
    const payload = await api('/review', {
      method: 'POST',
      body: JSON.stringify({ word: word.word, rating })
    }, { queueable: true });
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
  await api('/review', {
    method: 'POST',
    body: JSON.stringify({ word: word.word, rating: correct ? 'good' : 'again' })
  }, { queueable: true });
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
    return [word.word, word.meaning, word.pos, ...(word.senses || []).map((sense) => `${sense.pos || ''} ${sense.meaning || ''}`), ...word.synonyms, ...word.antonyms, ...word.proverbs, ...word.forms, ...word.collocations, ...word.examples]
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
  word.status = status;
  renderWordList();
  try {
    await api(`/words/${encodeURIComponent(wordText)}/status`, { method: 'PUT', body: JSON.stringify({ status }) }, { queueable: true });
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
  try {
    const [summary, ip] = await Promise.all([api('/sync/summary'), api('/ip')]);
    $('#syncSummary').innerHTML = `服务器修订版：${summary.revision}<br>已记录：${summary.progressCount} 词 · 错题：${summary.wrongCount} 个<br>最后同步：${formatDate(summary.updatedAt)}<br>最近自动备份：${formatDate(summary.latestBackupAt)}`;
    $('#syncStatusDot').classList.add('ok');
    $('#lanUrls').innerHTML = (ip.ips || []).map((address) => `<code>http://${escapeHtml(address)}:${ip.port}</code>`).join('');
  } catch {
    $('#syncSummary').textContent = '当前处于离线模式，记录会在恢复连接后自动上传。';
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
  const dailyGoalEnabled = $('#dailyGoalEnabled')?.checked !== false;
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
    const response = await fetch(`${API_ROOT}/progress/download`, { headers: { 'X-Sync-Code': state.syncCode } });
    if (!response.ok) throw new Error('导出失败');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vocab-backup-${state.syncCode}.json`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    showToast(error.message);
  }
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


function preferredVoice(lang) {
  const voices = speechSynthesis.getVoices?.() || [];
  const lowerLang = String(lang).toLowerCase();
  return voices.find((voice) => voice.lang?.toLowerCase() === lowerLang && /mandarin|普通话|国语|xiaoxiao|tingting|mei-jia/i.test(voice.name))
    || voices.find((voice) => voice.lang?.toLowerCase() === lowerLang)
    || voices.find((voice) => voice.lang?.toLowerCase().startsWith(lowerLang.slice(0, 2)))
    || null;
}

function speakText(text, lang, rate = 0.82) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      showToast('当前浏览器不支持朗读');
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
    speechSynthesis.speak(utterance);
  });
}

function speakWord(word) {
  if (!('speechSynthesis' in window)) return showToast('当前浏览器不支持朗读');
  speechSynthesis.cancel();
  speakText(word, 'en-US', 0.82);
}

function spokenMeaning(word) {
  return derivedSenses(word).map((sense) => `${sense.pos ? `${sense.pos}，` : ''}${sense.meaning}`).join('；') || word.meaning || '';
}

async function speakWordDetails(word) {
  await speakText(word.word, 'en-US', 0.82);
  const meaning = spokenMeaning(word);
  if (meaning) await speakText(meaning, 'zh-CN', 0.88);
}

async function toggleAutoReadUnknown() {
  if (state.autoReadActive) {
    state.autoReadActive = false;
    speechSynthesis?.cancel();
    $('#autoReadUnknown').textContent = '连续朗读不认识';
    return;
  }
  if (!('speechSynthesis' in window)) return showToast('当前浏览器不支持朗读');
  state.autoReadActive = true;
  $('#autoReadUnknown').textContent = '停止朗读';
  const section = $('#studySection')?.value || '';
  const words = filteredWords(section, 'notknown').filter((word) => word.status === 'new' || word.status === 'learning');
  for (const word of words) {
    if (!state.autoReadActive) break;
    await speakWordDetails(word);
  }
  state.autoReadActive = false;
  $('#autoReadUnknown').textContent = '连续朗读不认识';
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
