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


test('new screenshot corrections keep meanings and examples accurate', () => {
  const rootWords = readWords('words.json');
  const publicWords = readWords('public/words.json');
  const correctedWords = ['raise', 'rocket', 'rush', 'suppose', 'trust', 'way', 'wine'];

  for (const spelling of correctedWords) {
    assert.deepEqual(byWord(publicWords, spelling), byWord(rootWords, spelling));
  }

  const suppose = byWord(rootWords, 'suppose');
  assert.deepEqual(meanings(suppose), ['猜想；认为；料想', '假定；假设']);
  assert.ok(suppose.examples.some((example) => example.includes('假如那天所有房间都订满了，那怎么办？')));
  assert.ok(suppose.examples.every((example) => !example.includes('一 what then')));

  const wine = byWord(rootWords, 'wine');
  assert.deepEqual(meanings(wine), ['葡萄酒；果酒']);
  assert.ok(wine.examples.some((example) => example.includes('最好的葡萄')));
  assert.ok(wine.examples.every((example) => !example.includes('葡欧')));

  const trust = byWord(rootWords, 'trust');
  assert.deepEqual(meanings(trust), ['信任；信赖', '信任；相信']);
  assert.ok(trust.examples.some((example) => example.startsWith('There is a feeling of warmth and trust here.')));
  assert.ok(trust.examples.every((example) => !example.includes('Sr Theresa')));

  const way = byWord(rootWords, 'way');
  assert.deepEqual(meanings(way), ['路；路线；路途', '方法；方式；手段']);
  assert.ok(way.examples.some((example) => example.includes('去车站走哪条路最好')));
  assert.ok(way.examples.every((example) => !/成坟|打加/.test(example)));

  const rush = byWord(rootWords, 'rush');
  assert.deepEqual(meanings(rush), ['冲；奔；急忙', '匆忙；仓促']);
  assert.ok(rush.examples.some((example) => example.includes('匆匆忙忙地离开了家')));
  assert.ok(rush.examples.every((example) => !example.includes('勿匆忙忙')));

  const rocket = byWord(rootWords, 'rocket');
  assert.ok(rocket.examples.some((example) => example.includes('flew into space')));
  assert.ok(rocket.examples.every((example) => !example.includes('字宙')));

  const raise = byWord(rootWords, 'raise');
  assert.deepEqual(meanings(raise), ['举起；抬起', '提高；增加', '抚养；养育；饲养', '筹集（资金）']);
  for (const phrase of ['raise prices', 'raise a child', 'raise animals', 'raise money']) {
    assert.ok(raise.collocations.some((item) => item.startsWith(phrase)));
  }
});
