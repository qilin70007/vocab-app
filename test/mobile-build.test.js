'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

test('prepares an isolated APK bundle with the standalone page as index', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'vocab-mobile-build-'));
  const fixtureScripts = path.join(fixture, 'scripts');
  const fixturePublic = path.join(fixture, 'public');
  fs.mkdirSync(fixtureScripts);
  fs.mkdirSync(fixturePublic);

  const prepareSource = path.join(__dirname, '..', 'scripts', 'prepare_mobile.js');
  fs.copyFileSync(prepareSource, path.join(fixtureScripts, 'prepare_mobile.js'));
  fs.writeFileSync(path.join(fixture, 'words.json'), JSON.stringify([
    { word: 'offline', meaning: '离线' }
  ]));
  fs.writeFileSync(path.join(fixturePublic, 'index.html'), '<p>desktop entry</p>');
  fs.writeFileSync(
    path.join(fixturePublic, 'mobile.html'),
    '<script>window.VOCAB_STANDALONE = true;</script><p>mobile entry</p>'
  );
  fs.writeFileSync(path.join(fixturePublic, 'app.js'), 'globalThis.fixtureApp = true;');

  execFileSync(process.execPath, [path.join(fixtureScripts, 'prepare_mobile.js')]);

  const generatedIndex = fs.readFileSync(path.join(fixture, 'mobile-dist', 'index.html'), 'utf8');
  const originalIndex = fs.readFileSync(path.join(fixturePublic, 'index.html'), 'utf8');
  const generatedWords = JSON.parse(fs.readFileSync(path.join(fixture, 'mobile-dist', 'words.json'), 'utf8'));
  assert.match(generatedIndex, /VOCAB_STANDALONE = true/);
  assert.match(generatedIndex, /mobile entry/);
  assert.equal(originalIndex, '<p>desktop entry</p>');
  assert.equal(generatedWords[0].word, 'offline');
  assert.equal(fs.existsSync(path.join(fixture, 'mobile-dist', 'app.js')), true);
});

test('Capacitor packages the generated mobile directory instead of the server web root', () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'capacitor.config.json'), 'utf8'));

  assert.equal(config.webDir, 'mobile-dist');
});
