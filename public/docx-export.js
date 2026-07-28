'use strict';

(function exposeDocxExporter(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VocabDocx = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const encoder = new TextEncoder();
  const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const COLUMN_WIDTHS = [650, 2350, 900, 5650, 900];

  function xmlEscape(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }

  function concatBytes(parts) {
    const length = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    parts.forEach((part) => {
      output.set(part, offset);
      offset += part.length;
    });
    return output;
  }

  function littleEndian(size, value) {
    const output = new Uint8Array(size);
    const view = new DataView(output.buffer);
    if (size === 2) view.setUint16(0, value, true);
    else view.setUint32(0, value >>> 0, true);
    return output;
  }

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let number = 0; number < 256; number += 1) {
      let crc = number;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
      table[number] = crc >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function zipDateParts(date) {
    const year = Math.max(1980, date.getFullYear());
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
      date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
  }

  function createStoredZip(files, createdAt) {
    const localParts = [];
    const centralParts = [];
    const { time, date } = zipDateParts(createdAt);
    let localOffset = 0;

    files.forEach(({ name, content }) => {
      const nameBytes = encoder.encode(name);
      const data = typeof content === 'string' ? encoder.encode(content) : content;
      const crc = crc32(data);
      const localHeader = concatBytes([
        littleEndian(4, 0x04034b50), littleEndian(2, 20), littleEndian(2, 0x0800),
        littleEndian(2, 0), littleEndian(2, time), littleEndian(2, date),
        littleEndian(4, crc), littleEndian(4, data.length), littleEndian(4, data.length),
        littleEndian(2, nameBytes.length), littleEndian(2, 0), nameBytes
      ]);
      localParts.push(localHeader, data);

      centralParts.push(concatBytes([
        littleEndian(4, 0x02014b50), littleEndian(2, 20), littleEndian(2, 20),
        littleEndian(2, 0x0800), littleEndian(2, 0), littleEndian(2, time), littleEndian(2, date),
        littleEndian(4, crc), littleEndian(4, data.length), littleEndian(4, data.length),
        littleEndian(2, nameBytes.length), littleEndian(2, 0), littleEndian(2, 0),
        littleEndian(2, 0), littleEndian(2, 0), littleEndian(4, 0),
        littleEndian(4, localOffset), nameBytes
      ]));
      localOffset += localHeader.length + data.length;
    });

    const centralDirectory = concatBytes(centralParts);
    const end = concatBytes([
      littleEndian(4, 0x06054b50), littleEndian(2, 0), littleEndian(2, 0),
      littleEndian(2, files.length), littleEndian(2, files.length),
      littleEndian(4, centralDirectory.length), littleEndian(4, localOffset), littleEndian(2, 0)
    ]);
    return concatBytes([...localParts, centralDirectory, end]);
  }

  function run(text, options = {}) {
    const properties = [
      '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Microsoft YaHei"/>',
      options.bold ? '<w:b/>' : '',
      options.italic ? '<w:i/>' : '',
      options.color ? `<w:color w:val="${options.color}"/>` : '',
      `<w:sz w:val="${options.size || 18}"/><w:szCs w:val="${options.size || 18}"/>`
    ].join('');
    return `<w:r><w:rPr>${properties}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
  }

  function paragraph(runs, options = {}) {
    const alignment = options.align ? `<w:jc w:val="${options.align}"/>` : '';
    const spacing = `<w:spacing w:before="${options.before || 0}" w:after="${options.after || 0}" w:line="${options.line || 240}" w:lineRule="auto"/>`;
    return `<w:p><w:pPr>${alignment}${spacing}</w:pPr>${runs}</w:p>`;
  }

  function textParagraphs(value, options = {}) {
    const lines = String(value ?? '').split(/\r?\n/);
    return lines.map((line) => paragraph(run(line || ' ', options), options)).join('');
  }

  function cell(content, width, options = {}) {
    const shading = options.shading ? `<w:shd w:val="clear" w:color="auto" w:fill="${options.shading}"/>` : '';
    const vertical = `<w:vAlign w:val="${options.vertical || 'center'}"/>`;
    return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shading}${vertical}<w:tcMar><w:top w:w="70" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar></w:tcPr>${content}</w:tc>`;
  }

  function headerCell(text, width) {
    return cell(paragraph(run(text, { bold: true, size: 18 }), { align: 'center' }), width, { shading: 'EAF0FA' });
  }

  function printableItems(values) {
    const source = Array.isArray(values) ? values : (values == null ? [] : [values]);
    return source.map((value) => String(value ?? '').trim()).filter(Boolean);
  }

  function printableListSection(title, values, options = {}) {
    const items = printableItems(values);
    if (!items.length) return '';
    const color = options.color || '3157D5';
    const heading = paragraph(run(title, { bold: true, color, size: 17 }), { before: 70, after: 20 });
    const lines = items.map((value, index) => {
      const marker = options.numbered ? `${index + 1}. ` : '• ';
      return paragraph(
        run(marker, { bold: true, color, size: 16 }) + run(value, { size: 16 }),
        { after: 20, line: 220 }
      );
    }).join('');
    return heading + lines;
  }

  function wordRow(word, index) {
    const wordCell = paragraph(run(word.word || '', { bold: true, size: 19 }), { after: word.phonetic ? 20 : 0 })
      + (word.phonetic ? paragraph(run(word.phonetic, { color: '5F6B7D', size: 16 })) : '');
    const meaningCell = textParagraphs(word.meaning || '', { size: 18 })
      + printableListSection('常用词组', word.collocations, { color: '3157D5' })
      + printableListSection('对应例句', word.examples, { color: '2F6A45', numbered: true })
      + (word.customNote
        ? paragraph(run(`我的注释：${word.customNote}`, { italic: true, color: '3157D5', size: 16 }), { before: 50 })
        : '');
    return '<w:tr>'
      + cell(paragraph(run(String(index + 1), { size: 17 }), { align: 'center' }), COLUMN_WIDTHS[0])
      + cell(wordCell, COLUMN_WIDTHS[1])
      + cell(textParagraphs(word.pos || ' ', { align: 'center', size: 17 }), COLUMN_WIDTHS[2])
      + cell(meaningCell, COLUMN_WIDTHS[3], { vertical: 'top' })
      + cell(paragraph(run('□', { size: 24 }), { align: 'center' }), COLUMN_WIDTHS[4])
      + '</w:tr>';
  }

  function documentXml(words, displayDate) {
    const header = `<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>${['序号', '单词 / 音标', '词性', '释义 / 词组 / 例句', '掌握'].map((label, index) => headerCell(label, COLUMN_WIDTHS[index])).join('')}</w:tr>`;
    const rows = words.map(wordRow).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraph(run('未掌握单词清单', { bold: true, size: 36 }), { align: 'center', after: 80 })}
    ${paragraph(run(`导出日期：${displayDate}　共 ${words.length} 个单词`, { color: '5F6B7D', size: 18 }), { align: 'center', after: 120 })}
    <w:tbl>
      <w:tblPr><w:tblW w:w="10450" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="5" w:color="777777"/><w:left w:val="single" w:sz="5" w:color="777777"/><w:bottom w:val="single" w:sz="5" w:color="777777"/><w:right w:val="single" w:sz="5" w:color="777777"/><w:insideH w:val="single" w:sz="4" w:color="999999"/><w:insideV w:val="single" w:sz="4" w:color="999999"/></w:tblBorders></w:tblPr>
      <w:tblGrid>${COLUMN_WIDTHS.map((width) => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>
      ${header}${rows}
    </w:tbl>
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="680" w:right="728" w:bottom="680" w:left="728" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`;
  }

  function stylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Microsoft YaHei"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
</w:styles>`;
  }

  function createUnstudiedWordDocx(words, options = {}) {
    const createdAt = options.createdAt instanceof Date ? options.createdAt : new Date(options.createdAt || Date.now());
    const safeDate = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;
    const displayDate = options.displayDate || safeDate.toLocaleDateString('zh-CN');
    const isoDate = safeDate.toISOString();
    const files = [
      { name: '[Content_Types].xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` },
      { name: '_rels/.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
      { name: 'docProps/app.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>中考词汇背诵助手</Application></Properties>` },
      { name: 'docProps/core.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>未掌握单词清单</dc:title><dc:creator>中考词汇背诵助手</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${isoDate}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${isoDate}</dcterms:modified></cp:coreProperties>` },
      { name: 'word/document.xml', content: documentXml(words, displayDate) },
      { name: 'word/styles.xml', content: stylesXml() },
      { name: 'word/_rels/document.xml.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` }
    ];
    return createStoredZip(files, safeDate);
  }

  function bytesToBase64(bytes) {
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
  }

  return { DOCX_MIME, bytesToBase64, createUnstudiedWordDocx };
}));
