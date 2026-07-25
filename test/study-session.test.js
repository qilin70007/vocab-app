'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { URLSearchParams } = require('node:url');

function loadStudySessionHelpers() {
  const appPath = path.join(__dirname, '..', 'public', 'app.js');
  const source = fs.readFileSync(appPath, 'utf8');
  const storage = new Map();
  const context = {
    module: { exports: {} },
    console,
    URLSearchParams,
    location: { search: '' },
    navigator: { onLine: true },
    document: { addEventListener() {} },
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    }
  };
  context.window = context;
  context.globalThis = context;
  vm.runInNewContext(
    `${source}\nmodule.exports = { restoreStudyQueueFromSession, shouldSyncNativeReadingProgress };`,
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
