'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const readWords = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const byWord = (words, spelling) => words.find((entry) => entry.word === spelling);
const meanings = (entry) => entry.definitions.map((definition) => definition.meaning);

test('root and mobile wordbooks keep the corrected multi-meaning entries', () => {
  const rootWords = readWords('words.json');
  const publicWords = readWords('public/words.json');

  assert.equal(rootWords.length, 1785);
  assert.equal(publicWords.length, 1785);

  for (const spelling of ['paint', 'party', 'passage', 'performance', 'polite']) {
    assert.deepEqual(byWord(publicWords, spelling), byWord(rootWords, spelling));
  }

  const paint = byWord(rootWords, 'paint');
  assert.deepEqual(meanings(paint), ['给……油漆；粉刷', '绘画；画', '油漆；涂料；颜料']);
  assert.ok(paint.examples.some((example) => example.includes('把门漆成了蓝色')));
  assert.ok(paint.examples.some((example) => example.includes('一盒颜料')));
  assert.ok(paint.examples.every((example) => !example.includes('一金颜料')));

  const party = byWord(rootWords, 'party');
  assert.deepEqual(meanings(party), ['聚会；晚会', '政党；党派']);
  assert.ok(party.examples.some((example) => example.includes('political party')));

  const passage = byWord(rootWords, 'passage');
  assert.deepEqual(meanings(passage), ['（文章、讲话等的）一段；一节', '通道；过道']);
  assert.ok(passage.examples.some((example) => example.includes('通向后门')));
  assert.ok(passage.examples.some((example) => example.includes('这篇短文')));

  const performance = byWord(rootWords, 'performance');
  assert.deepEqual(meanings(performance), ['表演；演出', '表现；成绩', '性能；工作情况']);
  assert.ok(performance.examples.some((example) => example.includes('A班学生的表现比B班学生好得多')));
  assert.ok(performance.examples.some((example) => example.includes('性能更好')));
  assert.ok(performance.examples.every((example) => !/人A\s*班|也\s*班/.test(example)));

  const polite = byWord(rootWords, 'polite');
  assert.deepEqual(polite.forms, []);
  assert.deepEqual(polite.antonyms, ['impolite']);
  assert.ok(polite.collocations.includes('be polite to sb. 对某人有礼貌'));
});

test('departure keeps the corrected depart spelling in both wordbooks', () => {
  for (const file of ['words.json', 'public/words.json']) {
    const departure = byWord(readWords(file), 'departure');
    assert.ok(departure.forms.some((form) => /\bdepart\b/i.test(form)));
    assert.ok(departure.forms.every((form) => !/\bdeparty\b/i.test(form)));
  }
});
