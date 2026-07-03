// ============================================
// 中考词汇背诵助手 - 主应用 v3
// ============================================

const API = window.location.origin + '/api';

// ============ State ============
let allWords = [];
let filteredWords = [];
let currentWordIndex = 0;
let currentWord = null;
let quizWords = [];
let quizIndex = 0;
let quizAnswers = [];
let quizMode = 'en2cn'; // 'en2cn' or 'cn2en'
let reviewTab = 'all';
let reviewPage = 0;
let spellWords = [];
let spellIndex = 0;
let currentSpellWord = null;
let dailyStats = null;
let meaningVisibleGlobal = false; // 背词模式下的释义显示偏好，切换单词时保持

// ============ Init ============
document.addEventListener('DOMContentLoaded', () => {
  loadWords();
  // Keyboard shortcuts for study page
  document.addEventListener('keydown', handleKeyboardShortcuts);
  // Touch swipe for study card
  initSwipeGesture();
});

function handleKeyboardShortcuts(e) {
  // Only when on study page
  const studyPage = document.getElementById('page-study');
  if (!studyPage || !studyPage.classList.contains('active')) {
    // Also handle spell page
    const spellPage = document.getElementById('page-spell');
    if (spellPage && spellPage.classList.contains('active')) {
      if (e.key === 'Enter') {
        const feedback = document.getElementById('spellFeedback');
        if (feedback && feedback.classList.contains('hidden')) {
          checkSpelling();
        } else {
          nextSpellWord();
        }
      }
      return;
    }
    // Quiz modal
    if (!document.getElementById('quizModal').classList.contains('hidden')) {
      // number keys 1-4 for quiz options
      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key) - 1;
        const options = document.querySelectorAll('.quiz-option');
        if (options[idx] && options[idx].onclick) {
          options[idx].click();
        }
      }
      return;
    }
    return;
  }

  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

  const btnNew = document.getElementById('btnNew');
  const btnKnown = document.getElementById('btnKnown');
  const btnLearning = document.getElementById('btnLearning');

  if (e.code === 'Space') {
    e.preventDefault();
    // 空格：在新布局下无操作（信息已全部展示）
  } else if (e.key === 'ArrowLeft') {
    // ← 不认识，标记后自动跳下一个
    markWord('new');
  } else if (e.key === 'ArrowRight') {
    // → 认识，标记后自动跳下一个
    markWord('known');
  } else if (e.key === '1') {
    // 1 = 模糊
    markWord('learning');
  }
}

// ============ Toast ============
function showToast(msg, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), duration);
}

// ============ Data Loading ============
async function loadWords() {
  try {
    const res = await fetch(`${API}/words?status=all`);
    const data = await res.json();
    allWords = data.words;
    filteredWords = [...allWords];
    updateHeader();
    renderHome();
    populateSectionSelects();
  } catch (e) {
    console.error('Failed to load words:', e);
    document.getElementById('app').innerHTML = `
      <div class="empty-state" style="margin-top:100px">
        <div class="icon">⚠️</div>
        <p>加载失败，请确保服务器已启动</p>
        <p style="margin-top:8px;font-size:13px;color:#94A3B8">在软件目录运行: npm start</p>
      </div>`;
  }
}

// ============ Header ============
async function updateHeader() {
  try {
    const res = await fetch(`${API}/stats`);
    const stats = await res.json();
    document.getElementById('headerStats').innerHTML = `
      <span>📊 ${stats.progress}% 掌握</span>
      <span>✅ ${stats.known}/${stats.total}</span>
    `;
  } catch (e) { console.error(e); }
}

// ============ Navigation ============
function switchPage(page) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === 'page-' + page);
  });
  
  if (page === 'home') renderHome();
  else if (page === 'study') { currentWordIndex = 0; loadStudyWords(); }
  else if (page === 'review') renderReview();
  else if (page === 'spell') { spellIndex = 0; loadSpellWords(); }
  else if (page === 'list') { currentWordIndex = 0; filterWordList(); }
  else if (page === 'sync') renderSync();
}

// ============ Home Page ============
async function renderHome() {
  const res = await fetch(`${API}/stats`);
  const stats = await res.json();
  
  // Progress bar
  const pct = stats.progress;
  document.getElementById('statsCard').innerHTML = `
    <div class="title">📈 学习进度</div>
    <div style="background:#E2E8F0;border-radius:8px;height:12px;margin-bottom:16px;overflow:hidden">
      <div style="background:linear-gradient(90deg,#4F46E5,#10B981);height:100%;border-radius:8px;width:${pct}%;transition:width 0.5s"></div>
    </div>
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-num">${stats.total}</span>
        <span class="stat-label">总单词</span>
      </div>
      <div class="stat-item">
        <span class="stat-num new">${stats.new}</span>
        <span class="stat-label">未背过</span>
      </div>
      <div class="stat-item">
        <span class="stat-num learning">${stats.learning}</span>
        <span class="stat-label">学习中</span>
      </div>
      <div class="stat-item">
        <span class="stat-num known">${stats.known}</span>
        <span class="stat-label">已掌握</span>
      </div>
    </div>
  `;

  // Streak card
  try {
    const statsRes = await fetch(`${API}/daily-stats?days=7`);
    dailyStats = await statsRes.json();
    const todayData = dailyStats.days[dailyStats.today] || { studied: 0, known: 0, quizCorrect: 0, quizWrong: 0 };
    
    let weekHtml = '';
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    const sortedDays = Object.keys(dailyStats.days).sort();
    for (const day of sortedDays) {
      const d = new Date(day);
      const dn = dayNames[d.getDay()];
      const data = dailyStats.days[day];
      const h = Math.min(data.studied * 8, 48);
      weekHtml += `<div class="streak-day ${day === dailyStats.today ? 'today' : ''}">
        <div class="streak-bar" style="height:${Math.max(h, 4)}px"></div>
        <span class="streak-count">${data.studied || ''}</span>
        <span class="streak-label">${dn}</span>
      </div>`;
    }

    document.getElementById('streakCard').innerHTML = `
      <div class="streak-info">
        <span class="streak-flame">🔥</span>
        <span class="streak-num">${dailyStats.streak}</span>
        <span class="streak-text">天连续学习</span>
      </div>
      <div class="streak-week">${weekHtml}</div>
      <div class="streak-today">
        今日: ${todayData.studied} 词 · ✅${todayData.known} · 🎯${todayData.quizCorrect}/${todayData.quizCorrect + todayData.quizWrong || 0}
      </div>
    `;
  } catch (e) { console.error('Daily stats error:', e); }
  
  // Section grid
  const sectionsRes = await fetch(`${API}/sections`);
  const sections = await sectionsRes.json();
  const sectionKeys = Object.keys(sections).sort();
  
  let html = '';
  for (const key of sectionKeys) {
    const s = sections[key];
    const spct = s.total > 0 ? Math.round((s.known / s.total) * 100) : 0;
    html += `
      <div class="section-btn" onclick="jumpToSection('${key}')">
        <div class="letter">${key}</div>
        <div class="count">${s.total}词</div>
        <div class="progress"><div class="progress-bar" style="width:${spct}%"></div></div>
      </div>
    `;
  }
  document.getElementById('sectionGrid').innerHTML = html;
}

// ============ Section Selects ============
async function populateSectionSelects() {
  const res = await fetch(`${API}/sections`);
  const sections = await res.json();
  const keys = Object.keys(sections).sort();
  const opts = keys.map(k => `<option value="${k}">${k} (${sections[k].total}词)</option>`).join('');
  
  const studySel = document.getElementById('studySection');
  const listSel = document.getElementById('listSection');
  const spellSel = document.getElementById('spellSection');
  const reviewSel = document.getElementById('reviewSection');
  
  if (studySel) studySel.innerHTML = `<option value="">全部字母</option>` + opts;
  if (listSel) listSel.innerHTML = `<option value="">全部字母</option>` + opts;
  if (spellSel) spellSel.innerHTML = `<option value="">全部字母</option>` + opts;
  if (reviewSel) reviewSel.innerHTML = `<option value="">全部字母</option>` + opts;
}

// ============ Study Page ============
async function loadStudyWords() {
  const section = document.getElementById('studySection').value;
  const filter = document.getElementById('studyFilter').value;
  
  let url = `${API}/words?status=all`;
  if (section) url += `&section=${section}`;
  
  const res = await fetch(url);
  const data = await res.json();
  let words = data.words;
  
  // Client-side filter (prioritize unlearned words)
  if (filter === 'new') {
    words = words.filter(w => w.status === 'new');
  } else if (filter === 'learning') {
    words = words.filter(w => w.status === 'learning');
  } else if (filter === 'known') {
    words = words.filter(w => w.status === 'known');
  } else if (filter === 'notknown') {
    // 仅不认识：未背过 + 模糊，方便反复背诵
    words = words.filter(w => w.status === 'new' || w.status === 'learning');
  }
  
  filteredWords = words;
  currentWordIndex = 0;
  
  if (filteredWords.length === 0) {
    document.getElementById('studyCard').innerHTML = `
      <div class="empty-state">
        <div class="icon">🎉</div>
        <p>太棒了！当前筛选没有需要背的单词了！</p>
      </div>`;
    document.getElementById('studyHint').style.display = 'none';
    document.getElementById('studyCounter').textContent = '';
    return;
  }
  
  document.getElementById('studyHint').style.display = '';
  updateStudyCounter();
  renderStudyCard();
}

function renderStudyCard() {
  if (currentWordIndex >= filteredWords.length) currentWordIndex = 0;
  if (currentWordIndex < 0) currentWordIndex = filteredWords.length - 1;
  if (filteredWords.length === 0) return;
  
  currentWord = filteredWords[currentWordIndex];
  
  // 使用全局释义显示偏好，切换单词时保持
  const meaningVisible = meaningVisibleGlobal;
  
  // 紧凑布局：单词+音标+词性+词义一行，变形/搭配/例句直接展示
  const card = document.getElementById('studyCard');
  card.innerHTML = `
    <div class="card-topline">
      <span class="card-word">${currentWord.word}</span>
      <span class="card-phonetic">${currentWord.phonetic ? '[' + currentWord.phonetic + ']' : ''}</span>
      <span class="card-pos">${currentWord.pos}</span>
      <span class="card-meaning" id="cardMeaning" style="${meaningVisible ? '' : 'visibility:hidden'}">${currentWord.meaning}</span>
    </div>
    <div class="card-details" id="cardDetails" style="${meaningVisible ? '' : 'display:none'}">${buildDetailsHtml(currentWord)}</div>
    <div class="card-actions">
      <button class="btn btn-new" onclick="markWord('new')" style="flex:1;min-width:0;font-size:18px;padding:16px 12px">😕 不认识</button>
      <button class="btn btn-learning" onclick="markWord('learning')" style="flex:1;min-width:0;font-size:18px;padding:16px 12px">🤔 模糊</button>
      <button class="btn btn-known" onclick="markWord('known')" style="flex:1;min-width:0;font-size:18px;padding:16px 12px">😊 认识</button>
    </div>
    <div class="card-toggle-row">
      <button class="btn-toggle" id="btnToggleMeaning" onclick="toggleMeaning()">${meaningVisible ? '🔒 隐藏释义' : '👁 显示释义'}</button>
      <span class="card-progress" id="cardProgress">${currentWordIndex + 1} / ${filteredWords.length}</span>
    </div>
  `;
  
  updateStudyCounter();
}

function buildDetailsHtml(w) {
  let html = '';
  if (w.forms && w.forms.length > 0) {
    html += `<div class="detail-section"><div class="detail-title">📝 变形</div>`;
    for (const f of w.forms) {
      const text = typeof f === 'string' ? f : (f.form + (f.desc ? ' (' + f.desc + ')' : ''));
      html += `<div class="detail-item">${text}</div>`;
    }
    html += `</div>`;
  }
  if (w.collocations && w.collocations.length > 0) {
    html += `<div class="detail-section"><div class="detail-title">🔗 搭配</div>`;
    for (const c of w.collocations) {
      const text = typeof c === 'string' ? c : (c.eng + (c.chn ? ' ' + c.chn : ''));
      html += `<div class="detail-item">${text}</div>`;
    }
    html += `</div>`;
  }
  if (w.examples && w.examples.length > 0) {
    html += `<div class="detail-section"><div class="detail-title">💡 例句</div>`;
    for (let i = 0; i < w.examples.length; i++) {
      const ex = w.examples[i];
      // 处理中英文混合格式：分割英文和中文
      let enPart = ex;
      let cnPart = '';
      const cnMatch = ex.match(/[\u4e00-\u9fa5]/);
      if (cnMatch) {
        const beforeCn = ex.substring(0, cnMatch.index);
        const m = beforeCn.match(/.*[.!?]\s*/);
        if (m) {
          // 英文以句号/问号/感叹号结尾，在标点后分割
          const splitIndex = m[0].length;
          enPart = ex.substring(0, splitIndex).trim();
          cnPart = ex.substring(splitIndex).trim();
        } else {
          // 英文没有句号结尾（数据不完整或短语），直接在中文开始处分割
          enPart = beforeCn.trim();
          cnPart = ex.substring(cnMatch.index).trim();
        }
      }
      const cn = cnPart ? `<br><small style="color:#64748B">${cnPart}</small>` : '';
      html += `<div class="detail-item">${enPart}${cn}</div>`;
    }
    html += `</div>`;
  }
  return html;
}

// 切换释义显示/隐藏
function toggleMeaning() {
  if (!currentWord) return;
  
  // 切换全局释义显示状态
  meaningVisibleGlobal = !meaningVisibleGlobal;
  const meaningVisible = meaningVisibleGlobal;
  
  // 更新UI
  const meaningEl = document.getElementById('cardMeaning');
  const detailsEl = document.getElementById('cardDetails');
  const btnEl = document.getElementById('btnToggleMeaning');
  
  if (meaningEl) meaningEl.style.visibility = meaningVisible ? '' : 'hidden';
  if (detailsEl) detailsEl.style.display = meaningVisible ? '' : 'none';
  if (btnEl) btnEl.textContent = meaningVisible ? '🔒 隐藏释义' : '👁 显示释义';
}

// 显示释义（兼容旧调用）
function showMeaning() {
  if (!currentWord) return;
  if (!meaningVisibleGlobal) {
    toggleMeaning();
  }
}

async function markWord(status) {
  try {
    await fetch(`${API}/words/${encodeURIComponent(currentWord.word)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    
    currentWord.status = status;
    
    // If filtering by status, remove marked word from list
    const filter = document.getElementById('studyFilter').value;
    if (filter === 'notknown') {
      // notknown 模式下，标记为 known 的移出列表，其他保留
      if (status === 'known') {
        filteredWords.splice(currentWordIndex, 1);
      } else {
        // 不认识/模糊：移到列表末尾，方便反复背诵
        const w = filteredWords.splice(currentWordIndex, 1)[0];
        filteredWords.push(w);
      }
    } else if (filter !== 'all') {
      filteredWords.splice(currentWordIndex, 1);
    } else {
      // filter=全部：不认识/模糊 移到末尾再出现（避免马上重复），认识则前进
      if (status === 'known') {
        currentWordIndex++;
      } else {
        const w = filteredWords.splice(currentWordIndex, 1)[0];
        filteredWords.push(w);
        // index 不变，因为 splice 后下个词补到当前位置
      }
    }
    
    if (filteredWords.length > 0) {
      renderStudyCard();
    } else {
      document.getElementById('studyCard').innerHTML = `
        <div class="empty-state">
          <div class="icon">🎉</div>
          <p>太棒了！全部背完了！</p>
        </div>`;
      document.getElementById('studyHint').style.display = 'none';
      document.getElementById('studyCounter').textContent = '';
    }
    
    updateHeader();
  } catch (e) { console.error('Failed to mark word:', e); }
}

function updateStudyCounter() {
  const counter = document.getElementById('studyCounter');
  if (!counter) return;
  if (filteredWords.length === 0) { counter.textContent = ''; return; }
  const remaining = filteredWords.length - currentWordIndex;
  counter.textContent = `剩余 ${remaining} 词`;
}

// ============ Touch Swipe ============
function initSwipeGesture() {
  const card = document.getElementById('studyCard');
  if (!card) return;
  let startX = 0, startY = 0, isSwiping = false;

  card.addEventListener('touchstart', (e) => {
    const studyPage = document.getElementById('page-study');
    if (!studyPage || !studyPage.classList.contains('active')) return;
    // 释义显示与否都可以滑动
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isSwiping = true;
  }, { passive: true });

  card.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    isSwiping = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    // 水平滑动距离要大于垂直，且超过阈值
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) {
        // 左滑：不认识
        markWord('new');
      } else {
        // 右滑：认识
        markWord('known');
      }
    }
  }, { passive: true });
}

function nextWord() {
  currentWordIndex++;
  renderStudyCard();
}

// 首页点击字母跳转到背词页
function jumpToSection(section) {
  switchPage('study');
  const sel = document.getElementById('studySection');
  if (sel) sel.value = section;
  loadStudyWords();
}

// ============ Review Page ============
function switchReviewTab(tab) {
  reviewTab = tab;
  reviewPage = 0;
  document.querySelectorAll('.review-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  renderReview();
}

async function renderReview() {
  const actionsEl = document.getElementById('reviewActions');
  
  if (reviewTab === 'wrong') {
    // Wrong words (错题本)
    try {
      const res = await fetch(`${API}/wrong-words`);
      const data = await res.json();
      let wrongWords = data.words;
      
      // 字母筛选
      const section = document.getElementById('reviewSection');
      const sectionVal = section ? section.value : '';
      if (sectionVal) {
        wrongWords = wrongWords.filter(w => w.word.charAt(0).toUpperCase() === sectionVal);
      }
      
      document.getElementById('reviewCount').textContent = `错题本: ${wrongWords.length} 个`;
      
      if (wrongWords.length === 0) {
        document.getElementById('reviewList').innerHTML = `
          <div class="empty-state">
            <div class="icon">🌟</div>
            <p>错题本是空的，继续保持！</p>
          </div>`;
        actionsEl.innerHTML = '';
        return;
      }
      
      // 分页显示错题
      const pageSize = 50;
      const totalPages = Math.ceil(wrongWords.length / pageSize);
      if (reviewPage < 0) reviewPage = 0;
      if (reviewPage >= totalPages) reviewPage = totalPages - 1;
      const startIdx = reviewPage * pageSize;
      const display = wrongWords.slice(startIdx, startIdx + pageSize);
      
      let html = `<div style="font-size:13px;color:#64748B;margin-bottom:12px">第 ${reviewPage + 1} / ${totalPages} 页（每页 ${pageSize} 词）</div>`;
      for (const w of display) {
        html += `
          <div class="review-item" onclick="showWordDetail('${w.word}')">
            <div class="word-info">
              <span class="word-name">${w.word}</span>
              <span class="word-meaning">${w.meaning || ''} · 错${w.wrongCount}次</span>
            </div>
            <span class="word-status learning">错题</span>
          </div>`;
      }
      // 分页控件
      if (totalPages > 1) {
        html += `
          <div style="display:flex;justify-content:center;gap:8px;margin-top:16px;flex-wrap:wrap;align-items:center">
            ${reviewPage > 0 ? `<button class="btn" style="background:#E2E8F0;color:#1E293B;padding:8px 16px;font-size:13px" onclick="reviewPage=${reviewPage - 1};renderReview()">◀ 上一页</button>` : ''}
            <span style="padding:8px;font-size:13px;color:#64748B">第 ${reviewPage + 1} / ${totalPages} 页</span>
            ${reviewPage < totalPages - 1 ? `<button class="btn" style="background:#E2E8F0;color:#1E293B;padding:8px 16px;font-size:13px" onclick="reviewPage=${reviewPage + 1};renderReview()">下一页 ▶</button>` : ''}
          </div>`;
      }
      document.getElementById('reviewList').innerHTML = html;
      actionsEl.innerHTML = `
        <button class="btn btn-primary" onclick="startReviewQuiz('wrong')">🎯 错题测验</button>
        <button class="btn" style="background:#EF4444;color:white;width:100%;margin-top:8px" onclick="clearWrongWords()">🗑 清空错题本</button>
      `;
    } catch (e) { console.error(e); }
    return;
  }

  // All review words
  // 字母筛选
  const sectionEl = document.getElementById('reviewSection');
  const sectionVal = sectionEl ? sectionEl.value : '';
  
  let urlNew = `${API}/words?status=new`;
  let urlLearning = `${API}/words?status=learning`;
  if (sectionVal) {
    urlNew += `&section=${sectionVal}`;
    urlLearning += `&section=${sectionVal}`;
  }
  
  const resNew = await fetch(urlNew);
  const resLearning = await fetch(urlLearning);
  const dataNew = await resNew.json();
  const dataLearning = await resLearning.json();
  const reviewWords = [...dataNew.words, ...dataLearning.words];
  
  document.getElementById('reviewCount').textContent = `共 ${reviewWords.length} 个待复习`;
  
  if (reviewWords.length === 0) {
    document.getElementById('reviewList').innerHTML = `
      <div class="empty-state">
        <div class="icon">🌟</div>
        <p>太棒了！所有单词都已掌握！</p>
      </div>`;
    actionsEl.innerHTML = '';
    return;
  }
  
  // 分页显示
  const pageSize = 50;
  const totalPages = Math.ceil(reviewWords.length / pageSize);
  if (reviewPage < 0) reviewPage = 0;
  if (reviewPage >= totalPages) reviewPage = totalPages - 1;
  const startIdx = reviewPage * pageSize;
  const display = reviewWords.slice(startIdx, startIdx + pageSize);
  
  let html = `<div style="font-size:13px;color:#64748B;margin-bottom:12px">第 ${reviewPage + 1} / ${totalPages} 页（每页 ${pageSize} 词）</div>`;
  for (const w of display) {
    const label = w.status === 'new' ? '未背' : '模糊';
    const cls = w.status === 'new' ? 'new' : 'learning';
    html += `
      <div class="review-item" onclick="showWordDetail('${w.word}')">
        <div class="word-info">
          <span class="word-name">${w.word}</span>
          <span class="word-meaning">${w.meaning || w.pos}</span>
        </div>
        <span class="word-status ${cls}">${label}</span>
      </div>`;
  }
  
  // 分页控件
  if (totalPages > 1) {
    html += `
      <div style="display:flex;justify-content:center;gap:8px;margin-top:16px;flex-wrap:wrap;align-items:center">
        ${reviewPage > 0 ? `<button class="btn" style="background:#E2E8F0;color:#1E293B;padding:8px 16px;font-size:13px" onclick="reviewPage=${reviewPage - 1};renderReview()">◀ 上一页</button>` : ''}
        <span style="padding:8px;font-size:13px;color:#64748B">第 ${reviewPage + 1} / ${totalPages} 页</span>
        ${reviewPage < totalPages - 1 ? `<button class="btn" style="background:#E2E8F0;color:#1E293B;padding:8px 16px;font-size:13px" onclick="reviewPage=${reviewPage + 1};renderReview()">下一页 ▶</button>` : ''}
      </div>`;
  }
  document.getElementById('reviewList').innerHTML = html;
  
  // 测验按钮：当前页测验 + 全部随机测验
  actionsEl.innerHTML = `
    <button class="btn btn-primary" onclick="startReviewQuizPage()">🎯 本页测验（英文选释义）</button>
    <button class="btn btn-primary" style="background:#6366F1" onclick="startReviewQuizPage('cn2en')">🎯 本页测验（中文选英文）</button>
    <button class="btn" style="background:#10B981;color:white;width:100%;margin-top:8px" onclick="startReviewQuizAll()">🎲 全部随机测验（10题）</button>
  `;
}

async function clearWrongWords() {
  if (!confirm('确定清空错题本吗？')) return;
  try {
    const res = await fetch(`${API}/wrong-words`);
    const data = await res.json();
    for (const w of data.words) {
      await fetch(`${API}/wrong-words/${encodeURIComponent(w.word)}`, { method: 'DELETE' });
    }
    showToast('错题本已清空');
    renderReview();
  } catch (e) { console.error(e); }
}

// ============ Quiz ============
// 当前页单词测验
async function startReviewQuizPage(mode = 'en2cn') {
  quizMode = mode;
  // 从当前显示的复习词列表中取词
  const sectionEl = document.getElementById('reviewSection');
  const sectionVal = sectionEl ? sectionEl.value : '';
  let urlNew = `${API}/words?status=new`;
  let urlLearning = `${API}/words?status=learning`;
  if (sectionVal) {
    urlNew += `&section=${sectionVal}`;
    urlLearning += `&section=${sectionVal}`;
  }
  const resNew = await fetch(urlNew);
  const resLearning = await fetch(urlLearning);
  const dataNew = await resNew.json();
  const dataLearning = await resLearning.json();
  const allReviewWords = [...dataNew.words, ...dataLearning.words];
  
  const pageSize = 50;
  const startIdx = reviewPage * pageSize;
  quizWords = allReviewWords.slice(startIdx, startIdx + pageSize);
  
  if (quizWords.length === 0) {
    showToast('当前页没有可测验的单词');
    return;
  }
  
  quizIndex = 0;
  quizAnswers = [];
  quizWords = shuffle(quizWords).slice(0, Math.min(10, quizWords.length));
  document.getElementById('quizModal').classList.remove('hidden');
  document.getElementById('quizMode').textContent = mode === 'en2cn' ? '英文选释义' : '中文选英文';
  showQuizQuestion();
}

// 全部复习词随机测验
async function startReviewQuizAll() {
  quizMode = 'en2cn';
  const sectionEl = document.getElementById('reviewSection');
  const sectionVal = sectionEl ? sectionEl.value : '';
  let urlNew = `${API}/words?status=new`;
  let urlLearning = `${API}/words?status=learning`;
  if (sectionVal) {
    urlNew += `&section=${sectionVal}`;
    urlLearning += `&section=${sectionVal}`;
  }
  const resNew = await fetch(urlNew);
  const resLearning = await fetch(urlLearning);
  const dataNew = await resNew.json();
  const dataLearning = await resLearning.json();
  const allReviewWords = [...dataNew.words, ...dataLearning.words];
  
  if (allReviewWords.length === 0) {
    showToast('没有可测验的单词');
    return;
  }
  
  quizWords = shuffle(allReviewWords).slice(0, Math.min(10, allReviewWords.length));
  quizIndex = 0;
  quizAnswers = [];
  document.getElementById('quizModal').classList.remove('hidden');
  document.getElementById('quizMode').textContent = '随机10题';
  showQuizQuestion();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function startReviewQuiz(type = 'all', mode = 'en2cn') {
  quizMode = mode;
  
  if (type === 'wrong') {
    const res = await fetch(`${API}/wrong-words`);
    const data = await res.json();
    let wrongWords = data.words;
    // 字母筛选
    const sectionEl = document.getElementById('reviewSection');
    const sectionVal = sectionEl ? sectionEl.value : '';
    if (sectionVal) {
      wrongWords = wrongWords.filter(w => w.word.charAt(0).toUpperCase() === sectionVal);
    }
    quizWords = wrongWords.map(w => {
      const fullWord = allWords.find(x => x.word === w.word);
      return fullWord || w;
    });
  }
  
  if (!quizWords || quizWords.length === 0) {
    showToast('没有可测验的单词');
    return;
  }
  
  quizIndex = 0;
  quizAnswers = [];
  quizWords = shuffle(quizWords).slice(0, Math.min(10, quizWords.length));
  document.getElementById('quizModal').classList.remove('hidden');
  document.getElementById('quizMode').textContent = mode === 'en2cn' ? '英文选释义' : '中文选英文';
  showQuizQuestion();
}

function showQuizQuestion() {
  if (quizIndex >= quizWords.length) {
    showQuizResult();
    return;
  }
  
  const q = quizWords[quizIndex];
  document.getElementById('quizProgress').textContent = `${quizIndex + 1} / ${quizWords.length}`;
  document.getElementById('quizResult').classList.add('hidden');
  
  const correctAnswer = q.meaning || q.pos;
  
  if (quizMode === 'en2cn') {
    // Show English, pick Chinese meaning
    document.getElementById('quizWord').textContent = q.word;
    document.getElementById('quizPhonetic').textContent = q.phonetic ? '[' + q.phonetic + ']' : '';
    document.getElementById('quizPrompt').textContent = '选择正确的释义：';
    
    const others = shuffle(allWords.filter(w => w.word !== q.word && (w.meaning || w.pos) !== correctAnswer)).slice(0, 3);
    const options = shuffle([
      { word: q.word, text: correctAnswer, correct: true },
      ...others.map(w => ({ word: w.word, text: w.meaning || w.pos, correct: false }))
    ]);
    
    let html = '';
    for (const opt of options) {
      html += `<div class="quiz-option" data-correct="${opt.correct}" data-word="${opt.word}" onclick="answerQuiz(this)">${opt.text}</div>`;
    }
    document.getElementById('quizOptions').innerHTML = html;
  } else {
    // Show Chinese, pick English word
    document.getElementById('quizWord').textContent = correctAnswer;
    document.getElementById('quizPhonetic').textContent = '';
    document.getElementById('quizPrompt').textContent = '选择对应的英文单词：';
    
    const others = shuffle(allWords.filter(w => w.word !== q.word)).slice(0, 3);
    const options = shuffle([
      { word: q.word, text: q.word, correct: true },
      ...others.map(w => ({ word: w.word, text: w.word, correct: false }))
    ]);
    
    let html = '';
    for (const opt of options) {
      html += `<div class="quiz-option" data-correct="${opt.correct}" data-word="${opt.word}" onclick="answerQuiz(this)">${opt.text}</div>`;
    }
    document.getElementById('quizOptions').innerHTML = html;
  }
}

function answerQuiz(el) {
  const isCorrect = el.dataset.correct === 'true';
  const word = el.dataset.word;
  quizAnswers.push({ word, correct: isCorrect });
  
  // Highlight correct/wrong
  document.querySelectorAll('.quiz-option').forEach(opt => {
    opt.onclick = null;
    if (opt.dataset.correct === 'true') {
      opt.classList.add('correct');
    } else if (opt === el && !isCorrect) {
      opt.classList.add('wrong');
    }
  });
  
  // 答错加入错题本
  if (!isCorrect && word) {
    fetch(`${API}/wrong-words/${encodeURIComponent(word)}`, { method: 'POST' }).catch(() => {});
  }
  
  // Auto-advance
  setTimeout(() => {
    quizIndex++;
    showQuizQuestion();
  }, 1200);
}

function showQuizResult() {
  const correct = quizAnswers.filter(a => a.correct).length;
  const pct = Math.round((correct / quizWords.length) * 100);
  
  // Record quiz results to server
  fetch(`${API}/quiz/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results: quizAnswers })
  }).catch(e => console.error('Failed to record quiz:', e));
  
  document.getElementById('quizWord').textContent = '';
  document.getElementById('quizPhonetic').textContent = '';
  document.getElementById('quizPrompt').textContent = '';
  document.getElementById('quizOptions').innerHTML = '';
  document.getElementById('quizResult').innerHTML = `
    <div class="score">${correct} / ${quizWords.length}</div>
    <p style="margin-top:12px;color:#64748B;font-size:16px">正确率 ${pct}%</p>
    <p style="margin-top:8px;font-size:20px">${pct >= 80 ? '🎉 太棒了！' : pct >= 50 ? '💪 继续加油！' : '📖 多复习几遍！'}</p>
    <button class="btn btn-primary" onclick="closeQuiz(); renderReview();" style="margin-top:16px">返回复习</button>
  `;
  document.getElementById('quizResult').classList.remove('hidden');
  
  // Update header
  updateHeader();
}

function closeQuiz() {
  document.getElementById('quizModal').classList.add('hidden');
}

// ============ Spell Practice Page ============
async function loadSpellWords() {
  const section = document.getElementById('spellSection').value;
  const filter = document.getElementById('spellFilter').value;
  
  let url = `${API}/words?status=all`;
  if (section) url += `&section=${section}`;
  
  const res = await fetch(url);
  const data = await res.json();
  let words = data.words;
  
  if (filter === 'new') {
    words = words.filter(w => w.status === 'new');
  } else if (filter === 'learning') {
    words = words.filter(w => w.status === 'learning');
  } else if (filter === 'known') {
    words = words.filter(w => w.status === 'known');
  }
  
  spellWords = shuffle(words);
  spellIndex = 0;
  
  if (spellWords.length === 0) {
    document.getElementById('spellCard').innerHTML = `
      <div class="empty-state">
        <div class="icon">🎉</div>
        <p>没有可练习的单词！</p>
      </div>`;
    return;
  }
  
  renderSpellCard();
}

function renderSpellCard() {
  if (spellIndex >= spellWords.length) spellIndex = 0;
  if (spellWords.length === 0) return;
  
  currentSpellWord = spellWords[spellIndex];
  
  const card = document.getElementById('spellCard');
  card.innerHTML = `
    <div class="spell-meaning">${currentSpellWord.meaning || currentSpellWord.pos}</div>
    <div class="spell-pos">${currentSpellWord.pos}</div>
    <div class="spell-input-area">
      <input type="text" id="spellInput" placeholder="拼写英文单词..." autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" autofocus>
      <button class="btn btn-primary" onclick="checkSpelling()">提交</button>
    </div>
    <div class="spell-feedback hidden" id="spellFeedback"></div>
    <div class="spell-actions">
      <button class="btn btn-next" onclick="nextSpellWord()">▶ 下一个</button>
      <button class="btn btn-show-spell" onclick="revealSpelling()">👀 看答案</button>
    </div>
    <div class="card-progress">${spellIndex + 1} / ${spellWords.length}</div>
  `;
  
  document.getElementById('spellInput').focus();
  document.getElementById('spellInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const feedback = document.getElementById('spellFeedback');
      if (feedback.classList.contains('hidden')) {
        checkSpelling();
      } else {
        nextSpellWord();
      }
    }
  });
}

function checkSpelling() {
  const input = document.getElementById('spellInput');
  const answer = input.value.trim().toLowerCase();
  const correct = currentSpellWord.word.toLowerCase();
  
  const feedback = document.getElementById('spellFeedback');
  
  if (answer === correct) {
    feedback.innerHTML = `✅ 正确！${currentSpellWord.word} [${currentSpellWord.phonetic || ''}]`;
    feedback.className = 'spell-feedback correct';
    // Mark as known if was new
    if (currentSpellWord.status === 'new') {
      fetch(`${API}/words/${encodeURIComponent(currentSpellWord.word)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'known' })
      }).catch(() => {});
      currentSpellWord.status = 'known';
    }
  } else {
    feedback.innerHTML = `❌ 错误！正确答案是: <strong>${currentSpellWord.word}</strong> [${currentSpellWord.phonetic || ''}]<br>你写的: ${answer}`;
    feedback.className = 'spell-feedback wrong';
    // Add to wrong words
    fetch(`${API}/wrong-words/${encodeURIComponent(currentSpellWord.word)}`, {
      method: 'POST'
    }).catch(() => {});
  }
  
  feedback.classList.remove('hidden');
  updateHeader();
}

function revealSpelling() {
  const feedback = document.getElementById('spellFeedback');
  feedback.innerHTML = `👀 答案: <strong>${currentSpellWord.word}</strong> [${currentSpellWord.phonetic || ''}]`;
  feedback.className = 'spell-feedback revealed';
  feedback.classList.remove('hidden');
}

function nextSpellWord() {
  spellIndex++;
  renderSpellCard();
}

// ============ Word List Page ============
function filterWordList() {
  const search = document.getElementById('searchInput').value.trim().toLowerCase();
  const section = document.getElementById('listSection').value;
  const status = document.getElementById('listStatus').value;
  
  filteredWords = allWords.filter(w => {
    if (section && w.section !== section) return false;
    if (status && w.status !== status) return false;
    if (search && !w.word.toLowerCase().includes(search) && !(w.meaning || '').includes(search)) return false;
    return true;
  });
  
  currentWordIndex = 0;
  renderWordList();
}

function renderWordList() {
  const container = document.getElementById('wordList');
  
  if (filteredWords.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🔍</div>
        <p>没有找到匹配的单词</p>
      </div>`;
    return;
  }
  
  const pageSize = 50;
  const page = Math.floor(currentWordIndex / pageSize);
  const pageWords = filteredWords.slice(page * pageSize, (page + 1) * pageSize);
  
  let html = `<div style="font-size:13px;color:#64748B;margin-bottom:12px">共 ${filteredWords.length} 个单词</div>`;
  
  for (const w of pageWords) {
    const initial = w.word[0].toUpperCase();
    html += `
      <div class="word-item" onclick="showWordDetail('${w.word}')">
        <div class="word-left">
          <div class="word-initial">${initial}</div>
          <div class="word-text">
            <span class="name">${w.word}</span>
            <span class="meaning">${w.meaning || w.pos}</span>
          </div>
        </div>
        <div class="word-actions" onclick="event.stopPropagation()">
          <button class="status-btn ${w.status === 'new' ? 'active-new' : ''}" 
                  onclick="quickMark('${w.word}', 'new', this)" title="不认识">😕</button>
          <button class="status-btn ${w.status === 'learning' ? 'active-learning' : ''}" 
                  onclick="quickMark('${w.word}', 'learning', this)" title="模糊">🤔</button>
          <button class="status-btn ${w.status === 'known' ? 'active-known' : ''}" 
                  onclick="quickMark('${w.word}', 'known', this)" title="认识">😊</button>
        </div>
      </div>`;
  }
  
  const totalPages = Math.ceil(filteredWords.length / pageSize);
  if (totalPages > 1) {
    html += `
      <div style="display:flex;justify-content:center;gap:8px;margin-top:16px;flex-wrap:wrap;align-items:center">
        ${page > 0 ? `<button class="btn" style="background:#E2E8F0;color:#1E293B;padding:8px 16px;font-size:13px" onclick="currentWordIndex=${(page-1)*pageSize};renderWordList()">◀ 上一页</button>` : ''}
        <span style="padding:8px;font-size:13px;color:#64748B">第 ${page + 1} / ${totalPages} 页</span>
        ${page < totalPages - 1 ? `<button class="btn" style="background:#E2E8F0;color:#1E293B;padding:8px 16px;font-size:13px" onclick="currentWordIndex=${(page+1)*pageSize};renderWordList()">下一页 ▶</button>` : ''}
      </div>`;
  }
  
  container.innerHTML = html;
}

async function quickMark(word, status, btnEl) {
  try {
    await fetch(`${API}/words/${encodeURIComponent(word)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    
    // Update local
    const w = allWords.find(x => x.word === word);
    if (w) w.status = status;
    const fw = filteredWords.find(x => x.word === word);
    if (fw) fw.status = status;
    
    // Update button states in the same row
    if (btnEl) {
      const parent = btnEl.parentElement;
      parent.querySelectorAll('.status-btn').forEach(b => {
        b.classList.remove('active-new', 'active-learning', 'active-known');
      });
      btnEl.classList.add('active-' + status);
    }
    
    updateHeader();
  } catch (e) { console.error('Failed to mark:', e); }
}

// ============ Word Detail ============
function showWordDetail(word) {
  const w = allWords.find(x => x.word === word);
  if (!w) return;
  
  document.getElementById('detailWord').textContent = w.word;
  
  let html = '';
  html += `<div class="detail-section"><h3>🔊 音标</h3><p style="font-size:18px">[${w.phonetic || '-'}]</p></div>`;
  if (w.pos) html += `<div class="detail-section"><h3>📝 词性</h3><p>${w.pos}</p></div>`;
  if (w.meaning) html += `<div class="detail-section"><h3>📖 释义</h3><p style="font-size:17px">${w.meaning}</p></div>`;
  
  if (w.forms && w.forms.length > 0) {
    html += `<div class="detail-section"><h3>🔄 变形</h3><div class="form-list">`;
    for (const f of w.forms) {
      const text = typeof f === 'string' ? f : (f.form + (f.desc ? ' (' + f.desc + ')' : ''));
      html += `<div class="form-item">${text}</div>`;
    }
    html += `</div></div>`;
  }
  
  if (w.collocations && w.collocations.length > 0) {
    html += `<div class="detail-section"><h3>🔗 搭配</h3><div class="colloc-list">`;
    for (const c of w.collocations) {
      const text = typeof c === 'string' ? c : (c.eng + (c.chn ? ' ' + c.chn : ''));
      html += `<div class="colloc-item">${text}</div>`;
    }
    html += `</div></div>`;
  }
  
  if (w.examples && w.examples.length > 0) {
    html += `<div class="detail-section"><h3>💡 例句</h3>`;
    for (let i = 0; i < w.examples.length; i++) {
      const ex = w.examples[i];
      // 处理中英文混合格式：分割英文和中文
      let enPart = ex;
      let cnPart = '';
      const cnMatch = ex.match(/[\u4e00-\u9fa5]/);
      if (cnMatch) {
        const beforeCn = ex.substring(0, cnMatch.index);
        const m = beforeCn.match(/.*[.!?]\s*/);
        if (m) {
          const splitIndex = m[0].length;
          enPart = ex.substring(0, splitIndex).trim();
          cnPart = ex.substring(splitIndex).trim();
        } else {
          // 英文没有句号结尾，直接在中文开始处分割
          enPart = beforeCn.trim();
          cnPart = ex.substring(cnMatch.index).trim();
        }
      }
      const cn = cnPart ? `<div class="example-cn">${cnPart}</div>` : '';
      html += `<div class="example-item"><div class="example-en">${enPart}</div>${cn}</div>`;
    }
    html += `</div>`;
  }
  
  html += `
    <div style="display:flex;gap:8px;margin-top:20px">
      <button class="btn btn-new" style="flex:1" onclick="quickMark('${w.word}','new');closeDetail()">😕 不认识</button>
      <button class="btn btn-learning" style="flex:1" onclick="quickMark('${w.word}','learning');closeDetail()">🤔 模糊</button>
      <button class="btn btn-known" style="flex:1" onclick="quickMark('${w.word}','known');closeDetail()">😊 认识</button>
    </div>
  `;
  
  document.getElementById('detailBody').innerHTML = html;
  document.getElementById('detailModal').classList.remove('hidden');
}

function closeDetail() {
  document.getElementById('detailModal').classList.add('hidden');
  // Refresh current page if needed
  const activePage = document.querySelector('.page.active');
  if (activePage && activePage.id === 'page-list') filterWordList();
  else if (activePage && activePage.id === 'page-review') renderReview();
}

// ============ Sync Page ============
async function renderSync() {
  try {
    const res = await fetch(`${API}/stats`);
    await res.json();
    
    const urlsHtml = `
      <div class="url-item"><span class="url-label">电脑:</span><span class="url-value">http://localhost:3000</span></div>
    `;
    
    document.getElementById('syncUrls').innerHTML = urlsHtml +
      '<div style="font-size:12px;color:#94A3B8;margin-top:8px">手机需与电脑在同一WiFi下，将localhost替换为电脑IP地址</div>';
    
    try {
      const ipRes = await fetch('/api/ip');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        let ipHtml = '';
        for (const ip of ipData.ips) {
          ipHtml += `<div class="url-item"><span class="url-label">手机:</span><span class="url-value">http://${ip}:3000</span></div>`;
        }
        document.getElementById('syncUrls').innerHTML = urlsHtml + ipHtml;
      }
    } catch(e) {}
    
  } catch(e) {
    console.error(e);
  }
}

function exportProgress() {
  window.open(`${API}/progress/download`, '_blank');
}

async function importProgress(input) {
  if (!input.files || !input.files[0]) return;
  
  const file = input.files[0];
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const res = await fetch(`${API}/progress/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    
    if (res.ok) {
      showToast(`✅ 导入成功！更新了 ${data.updated} 个单词的进度`);
      loadWords();
    } else {
      showToast('❌ 导入失败: ' + data.error);
    }
  } catch (e) {
    showToast('❌ 导入失败: ' + e.message);
  }
  
  input.value = '';
}

async function resetProgress() {
  if (!confirm('⚠️ 确定要重置所有学习进度吗？此操作不可撤销！')) return;
  if (!confirm('再次确认：真的要重置吗？')) return;
  
  try {
    const res = await fetch(`${API}/reset`, { method: 'POST' });
    await res.json();
    showToast('✅ 进度已重置！');
    loadWords();
  } catch (e) {
    showToast('❌ 重置失败: ' + e.message);
  }
}
