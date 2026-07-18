'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { bytesToBase64, createUnstudiedWordDocx, DOCX_MIME } = require('../public/docx-export');

function storedZipEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries = new Map();
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true);
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    assert.equal(method, 0, 'DOCX entries should use ZIP store mode');
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    entries.set(name, bytes.subarray(dataStart, dataStart + size));
    offset = dataStart + size;
  }
  return entries;
}

test('creates a standard DOCX package with printable vocabulary rows', () => {
  const bytes = createUnstudiedWordDocx([
    { word: 'ability', phonetic: "[ə'bɪləti]", pos: 'n.', meaning: '能力', customNote: '搭配：have the ability to do sth.' },
    { word: 'A&B <test>', pos: 'n.', meaning: '测试 & 检查' }
  ], { createdAt: new Date('2026-07-18T12:00:00Z'), displayDate: '2026/7/18' });

  assert.equal(DOCX_MIME, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.deepEqual([...bytes.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04]);

  const entries = storedZipEntries(bytes);
  assert.deepEqual([...entries.keys()].sort(), [
    '[Content_Types].xml',
    '_rels/.rels',
    'docProps/app.xml',
    'docProps/core.xml',
    'word/_rels/document.xml.rels',
    'word/document.xml',
    'word/styles.xml'
  ].sort());

  const document = new TextDecoder().decode(entries.get('word/document.xml'));
  assert.match(document, /未掌握单词清单/);
  assert.match(document, /共 2 个单词/);
  assert.match(document, /have the ability to do sth\./);
  assert.match(document, /A&amp;B &lt;test&gt;/);
  assert.match(document, /测试 &amp; 检查/);
  assert.match(document, /<w:tblHeader\/>/);

  const decoded = Buffer.from(bytesToBase64(bytes), 'base64');
  assert.deepEqual(decoded, Buffer.from(bytes));
});
