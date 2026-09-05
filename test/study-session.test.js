'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { URLSearchParams } = require('node:url');

function loadStudySessionHelpers({
  nativeBridge = null,
  userAgent = '',
  hostname = '',
  builtinWords = null,
  serviceWorker = null,
  cacheStorage = null
} = {}) {
  const appPath = path.join(__dirname, '..', 'public', 'app.js');
  const source = fs.readFileSync(appPath, 'utf8');
  const storage = new Map();
  const context = {
    module: { exports: {} },
    console,
    URLSearchParams,
    location: { search: '', hostname },
    navigator: { onLine: true, userAgent, ...(serviceWorker ? { serviceWorker } : {}) },
    document: { addEventListener() {}, querySelector() { return null; } },
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    }
  };
  if (nativeBridge) context.VocabNative = nativeBridge;
  if (builtinWords) context.VOCAB_BUILTIN_WORDS = builtinWords;
  if (cacheStorage) context.caches = cacheStorage;
  context.window = context;
  context.globalThis = context;
  vm.runInNewContext(
    `${source}\nmodule.exports = { STANDALONE_MODE, disableStandaloneWebCaches, flushPendingMutations, restoreStudyQueueFromSession, shouldSyncNativeReadingProgress };`,
    context,
    { filename: appPath }
  );
  return context.module.exports;
}

test('restores the exact saved random queue and current word', () => {
  const { restoreStudyQueueFromSession } = loadStudySessionHelpers();
  const candidates = ['alpha', 'bravo', 'charlie'].map((word) => ({ word }));
  const restored = restoreStudyQueueFromSession(candidates, {
    savedQueue: ['charlie', 'alpha', 'bravo'],
    currentWord: 'alpha',
    currentIndex: 1,
    limit: 3
  });

  assert.deepEqual(Array.from(restored, (word) => word.word), ['charlie', 'alpha', 'bravo']);
});

test('keeps the current word inside a limited queue when restoring an older session', () => {
  const { restoreStudyQueueFromSession } = loadStudySessionHelpers();
  const candidates = ['alpha', 'bravo', 'charlie', 'delta'].map((word) => ({ word }));
  const restored = restoreStudyQueueFromSession(candidates, {
    currentWord: 'delta',
    currentIndex: 1,
    limit: 2
  });

  assert.deepEqual(Array.from(restored, (word) => word.word), ['alpha', 'delta']);
});

test('ignores a native reading index unless this page started continuous reading', () => {
  const { shouldSyncNativeReadingProgress } = loadStudySessionHelpers();

  assert.equal(shouldSyncNativeReadingProgress(false, null), false);
  assert.equal(shouldSyncNativeReadingProgress(true, null), true);
  assert.equal(shouldSyncNativeReadingProgress(false, 123), true);
});

test('recognizes the injected Android bridge as standalone without Wi-Fi or Capacitor globals', () => {
  const { STANDALONE_MODE } = loadStudySessionHelpers({ nativeBridge: {} });

  assert.equal(STANDALONE_MODE, true);
});

test('recognizes the packaged local Android WebView as standalone without injected globals', () => {
  const { STANDALONE_MODE } = loadStudySessionHelpers({
    hostname: 'localhost',
    userAgent: 'Mozilla/5.0 (Linux; Android 16; Device Build/TEST; wv) Version/4.0 Chrome/140 Mobile Safari/537.36'
  });

  assert.equal(STANDALONE_MODE, true);
});

test('recognizes the embedded APK word list as an authoritative standalone marker', () => {
  const { STANDALONE_MODE } = loadStudySessionHelpers({
    builtinWords: [{ word: 'offline' }]
  });

  assert.equal(STANDALONE_MODE, true);
});

test('never attempts desktop API mutation flushing during standalone APK startup', async () => {
  const { flushPendingMutations } = loadStudySessionHelpers({
    builtinWords: [{ word: 'offline' }]
  });

  await flushPendingMutations();
});

test('removes stale web service workers and only the app caches in standalone mode', async () => {
  let unregisterCount = 0;
  const deleted = [];
  const { disableStandaloneWebCaches } = loadStudySessionHelpers({
    serviceWorker: {
      async getRegistrations() {
        return [{ async unregister() { unregisterCount += 1; return true; } }];
      }
    },
    cacheStorage: {
      async keys() { return ['vocab-master-v2.5.7', 'another-app-cache']; },
      async delete(key) { deleted.push(key); return true; }
    }
  });

  await disableStandaloneWebCaches();

  assert.equal(unregisterCount, 1);
  assert.deepEqual(deleted, ['vocab-master-v2.5.7']);
});
