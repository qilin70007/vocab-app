const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Data paths
const WORDS_PATH = path.join(__dirname, 'words.json');
const FALLBACK_WORDS_PATH = path.join(__dirname, 'data', 'words_800.json');
const PROGRESS_PATH = path.join(__dirname, 'data', 'progress.json');

function normalizeWordRecord(record, index) {
  const word = String(record.word || '').trim().toLowerCase();
  const section = /^[a-z]/.test(word) ? word[0].toUpperCase() : '#';
  return {
    id: record.id || index + 1,
    word,
    section: record.section || section,
    phonetic: record.phonetic || '',
    pos: record.pos || '',
    meaning: record.meaning || '',
    forms: record.forms || (record.variant ? `变体：${record.variant}` : ''),
    collocations: record.collocations || record.usage || '',
    example: record.example || '',
    source: record.source || '26年初中英语考纲词汇用法手册'
  };
}

function loadWordsFromDisk() {
  const activePath = fs.existsSync(WORDS_PATH) ? WORDS_PATH : FALLBACK_WORDS_PATH;
  const loaded = JSON.parse(fs.readFileSync(activePath, 'utf-8'));
  return loaded.map(normalizeWordRecord).filter(w => w.word && w.meaning);
}

// Load words
let words = [];
try {
  words = loadWordsFromDisk();
  console.log(`Loaded ${words.length} words`);
} catch (e) {
  console.error('Failed to load words:', e.message);
}

// Load/Save progress
function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), 'utf-8');
}

// Daily stats path
const DAILY_STATS_PATH = path.join(__dirname, 'data', 'daily-stats.json');
const WRONG_WORDS_PATH = path.join(__dirname, 'data', 'wrong-words.json');

function loadDailyStats() {
  try {
    return JSON.parse(fs.readFileSync(DAILY_STATS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveDailyStats(stats) {
  fs.writeFileSync(DAILY_STATS_PATH, JSON.stringify(stats, null, 2), 'utf-8');
}

function loadWrongWords() {
  try {
    return JSON.parse(fs.readFileSync(WRONG_WORDS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveWrongWords(data) {
  fs.writeFileSync(WRONG_WORDS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function getTodayKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 10);
}

function recordDailyActivity(type, count = 1) {
  const stats = loadDailyStats();
  const today = getTodayKey();
  if (!stats[today]) {
    stats[today] = { studied: 0, known: 0, learning: 0, quizCorrect: 0, quizWrong: 0 };
  }
  if (type === 'studied') stats[today].studied += count;
  else if (type === 'known') stats[today].known += count;
  else if (type === 'learning') stats[today].learning += count;
  else if (type === 'quizCorrect') stats[today].quizCorrect += count;
  else if (type === 'quizWrong') stats[today].quizWrong += count;
  saveDailyStats(stats);
}

// ============ API Routes ============

// Reload words from file (picks up data updates without restart)
function reloadWords() {
  try {
    words = loadWordsFromDisk();
  } catch (e) {
    console.error('Failed to reload words:', e.message);
  }
}

// Get all words (with optional section filter)
app.get('/api/words', (req, res) => {
  reloadWords(); // Always serve fresh data
  const { section, status, search } = req.query;
  const progress = loadProgress();
  
  let result = words.map(w => ({
    ...w,
    status: progress[w.word]?.status || 'new',
    reviewCount: progress[w.word]?.reviewCount || 0,
    lastReview: progress[w.word]?.lastReview || null
  }));

  if (section) {
    result = result.filter(w => w.section === section.toUpperCase());
  }
  if (status && status !== 'all') {
    const statuses = status.split(',');
    result = result.filter(w => statuses.includes(w.status));
  }
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(w => 
      w.word.toLowerCase().includes(s) || 
      w.meaning.includes(s)
    );
  }

  res.json({ total: result.length, words: result });
});

// Get word sections (A-Z with counts)
app.get('/api/sections', (req, res) => {
  reloadWords();
  const progress = loadProgress();
  const sections = {};
  
  for (const w of words) {
    if (!sections[w.section]) {
      sections[w.section] = { total: 0, new: 0, learning: 0, known: 0 };
    }
    sections[w.section].total++;
    const s = progress[w.word]?.status || 'new';
    sections[w.section][s]++;
  }

  res.json(sections);
});

// Get statistics
app.get('/api/stats', (req, res) => {
  reloadWords();
  const progress = loadProgress();
  const stats = { total: words.length, new: 0, learning: 0, known: 0 };
  
  for (const w of words) {
    const s = progress[w.word]?.status || 'new';
    stats[s]++;
  }

  stats.progress = stats.total > 0 ? Math.round((stats.known / stats.total) * 100) : 0;
  res.json(stats);
});

// Update word status (mark as new/learning/known)
app.put('/api/words/:word/status', (req, res) => {
  const { word } = req.params;
  const { status } = req.body; // 'new' | 'learning' | 'known'
  
  if (!['new', 'learning', 'known'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Use: new, learning, known' });
  }

  const progress = loadProgress();
  if (!progress[word]) {
    progress[word] = { status: 'new', reviewCount: 0, lastReview: null, markTime: null };
  }
  
  progress[word].status = status;
  progress[word].reviewCount++;
  progress[word].lastReview = new Date().toISOString();
  if (status !== 'new') {
    progress[word].markTime = progress[word].markTime || new Date().toISOString();
  } else {
    progress[word].markTime = null;
  }
  
  saveProgress(progress);
  
  // Record daily activity
  recordDailyActivity('studied');
  if (status === 'known') recordDailyActivity('known');
  else if (status === 'learning') recordDailyActivity('learning');
  
  res.json({ word, status, progress: progress[word] });
});

// Batch update statuses
app.put('/api/words/batch', (req, res) => {
  const { updates } = req.body; // [{word, status}, ...]
  const progress = loadProgress();
  const now = new Date().toISOString();
  
  for (const { word, status } of updates) {
    if (!['new', 'learning', 'known'].includes(status)) continue;
    if (!progress[word]) {
      progress[word] = { status: 'new', reviewCount: 0, lastReview: null, markTime: null };
    }
    progress[word].status = status;
    progress[word].reviewCount++;
    progress[word].lastReview = now;
    if (status !== 'new') {
      progress[word].markTime = progress[word].markTime || now;
    } else {
      progress[word].markTime = null;
    }
  }
  
  saveProgress(progress);
  res.json({ updated: updates.length });
});

// ============ Daily Stats API ============

// Get daily stats (last N days)
app.get('/api/daily-stats', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const stats = loadDailyStats();
  const today = getTodayKey();
  const result = {};
  
  // Build last N days
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const offset = d.getTimezoneOffset() * 60000;
    const key = new Date(d - offset).toISOString().slice(0, 10);
    result[key] = stats[key] || { studied: 0, known: 0, learning: 0, quizCorrect: 0, quizWrong: 0 };
  }
  
  // Calculate streak
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const offset = d.getTimezoneOffset() * 60000;
    const key = new Date(d - offset).toISOString().slice(0, 10);
    if (stats[key] && stats[key].studied > 0) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  
  res.json({ days: result, streak, today });
});

// ============ Wrong Words (错题本) API ============

// Get wrong words
app.get('/api/wrong-words', (req, res) => {
  const data = loadWrongWords();
  const words = Object.keys(data).map(w => ({
    word: w,
    ...data[w],
    meaning: (require('./words.json').find(x => x.word === w) || {}).meaning || ''
  }));
  res.json({ total: words.length, words });
});

// Add wrong word
app.post('/api/wrong-words/:word', (req, res) => {
  const { word } = req.params;
  const data = loadWrongWords();
  if (!data[word]) {
    data[word] = { wrongCount: 1, addedAt: new Date().toISOString(), lastWrongAt: new Date().toISOString() };
  } else {
    data[word].wrongCount++;
    data[word].lastWrongAt = new Date().toISOString();
  }
  saveWrongWords(data);
  res.json({ word, ...data[word] });
});

// Remove wrong word (when answered correctly)
app.delete('/api/wrong-words/:word', (req, res) => {
  const { word } = req.params;
  const data = loadWrongWords();
  delete data[word];
  saveWrongWords(data);
  res.json({ message: 'Removed', word });
});

// Record quiz result
app.post('/api/quiz/result', (req, res) => {
  const { results } = req.body; // [{ word, correct }]
  const data = loadWrongWords();
  
  for (const { word, correct } of results) {
    if (correct) {
      // Remove from wrong words if exists
      delete data[word];
      recordDailyActivity('quizCorrect');
    } else {
      // Add to wrong words
      if (!data[word]) {
        data[word] = { wrongCount: 1, addedAt: new Date().toISOString(), lastWrongAt: new Date().toISOString() };
      } else {
        data[word].wrongCount++;
        data[word].lastWrongAt = new Date().toISOString();
      }
      recordDailyActivity('quizWrong');
    }
  }
  
  saveWrongWords(data);
  res.json({ message: 'Quiz results recorded', total: results.length });
});

// Reset all progress
app.post('/api/reset', (req, res) => {
  const progress = {};
  for (const w of words) {
    progress[w.word] = { status: 'new', reviewCount: 0, lastReview: null, markTime: null };
  }
  saveProgress(progress);
  saveWrongWords({});
  saveDailyStats({});
  res.json({ message: 'Progress reset', total: words.length });
});

// Export progress (for sync)
app.get('/api/progress/export', (req, res) => {
  const progress = loadProgress();
  res.json(progress);
});

// Import progress (for sync)
app.post('/api/progress/import', (req, res) => {
  const incoming = req.body;
  const current = loadProgress();
  
  // Merge: incoming data takes precedence if newer
  for (const [word, data] of Object.entries(incoming)) {
    if (!current[word]) {
      current[word] = data;
    } else {
      // Use the one with more recent lastReview
      const curTime = current[word].lastReview ? new Date(current[word].lastReview).getTime() : 0;
      const inTime = data.lastReview ? new Date(data.lastReview).getTime() : 0;
      if (inTime > curTime) {
        current[word] = data;
      }
    }
  }
  
  saveProgress(current);
  res.json({ message: 'Progress imported', total: Object.keys(current).length });
});

// Download progress as JSON file (for manual sync)
app.get('/api/progress/download', (req, res) => {
  const progress = loadProgress();
  const data = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    wordCount: Object.keys(progress).length,
    progress
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=vocab-progress.json');
  res.json(data);
});

// Upload progress JSON file (for manual sync)
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, 'data', 'uploads') });

app.post('/api/progress/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  try {
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    const imported = JSON.parse(fileContent);
    const incoming = imported.progress || imported;
    
    const current = loadProgress();
    let updated = 0;
    
    for (const [word, data] of Object.entries(incoming)) {
      if (!current[word]) {
        current[word] = data;
        updated++;
      } else {
        const curTime = current[word].lastReview ? new Date(current[word].lastReview).getTime() : 0;
        const inTime = data.lastReview ? new Date(data.lastReview).getTime() : 0;
        if (inTime > curTime) {
          current[word] = data;
          updated++;
        }
      }
    }
    
    saveProgress(current);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ message: 'Progress imported', updated, total: Object.keys(current).length });
  } catch (e) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ error: 'Invalid file: ' + e.message });
  }
});

// Get local IP addresses for mobile access
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

// API: Get server IP
app.get('/api/ip', (req, res) => {
  res.json({ ips: getLocalIPs() });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('\n========================================');
  console.log('  📖 中考词汇背诵助手 已启动！');
  console.log('========================================');
  console.log(`  电脑访问: http://localhost:${PORT}`);
  for (const ip of ips) {
    console.log(`  手机访问: http://${ip}:${PORT}`);
  }
  console.log('========================================\n');
});
