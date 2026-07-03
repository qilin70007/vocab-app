'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp, sanitizeSyncCode } = require('../server');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vocab-master-'));
const wordsPath = path.join(tempRoot, 'words.json');
const dataDir = path.join(tempRoot, 'data');
fs.writeFileSync(wordsPath, JSON.stringify([
  { word: 'ability', pos: 'n.', meaning: '能力', example: 'She has the ability to learn.' },
  { word: 'able', pos: 'adj.', meaning: '能够的', collocations: 'be able to do sth.' }
]), 'utf8');

const { app } = createApp({
  rootDir: tempRoot,
  dataDir,
  wordsPath,
  publicDir: path.join(__dirname, '..', 'public')
});
let server;
let base;

test.before(async () => {
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

async function request(pathname, options = {}, code = 'AAAAAA') {
  const headers = { 'X-Sync-Code': code, ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${base}${pathname}`, { ...options, headers });
  return { response, body: await response.json() };
}

test('normalizes sync codes safely', () => {
  assert.equal(sanitizeSyncCode('ab-cd 12'), 'ABCD12');
  assert.equal(sanitizeSyncCode('../bad'), 'LOCAL');
});

test('serves vocabulary and initial statistics', async () => {
  const health = await request('/api/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.wordCount, 2);
  const stats = await request('/api/stats');
  assert.deepEqual({ total: stats.body.total, new: stats.body.new, known: stats.body.known }, { total: 2, new: 2, known: 0 });
});

test('persists status and isolates sync profiles', async () => {
  const update = await request('/api/words/ability/status', {
    method: 'PUT', body: JSON.stringify({ status: 'known' })
  }, 'AAAAAA');
  assert.equal(update.response.status, 200);
  assert.equal(update.body.progress.status, 'known');
  const first = await request('/api/stats', {}, 'AAAAAA');
  const second = await request('/api/stats', {}, 'BBBBBB');
  assert.equal(first.body.known, 1);
  assert.equal(second.body.known, 0);
});

test('applies spaced repetition reviews', async () => {
  const result = await request('/api/review', {
    method: 'POST', body: JSON.stringify({ word: 'able', rating: 'good' })
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.progress.reviewCount, 1);
  assert.ok(result.body.progress.nextReviewAt);
});
