/* ============================================================
   EXCEL (.xlsx) WORKBOOKS FOR THE ADMIN EXPORTS

   A small, dependency-free writer: an .xlsx file is a zip of a few XML
   files, so the workbook is built here and zipped without compression.
   Nothing is loaded from a CDN, so the download also works offline and on
   school networks that block one.

   Every text cell is written as text (an inline string), never as a
   formula, so a name like "=SUM(...)" stays plain text -- the CSV export
   needs csvEscape's guard for that; this format does not.

   xlsxBuild([{ name, rows, widths? }]) -> Uint8Array
     rows[0] is the header row (bold, frozen, with filter buttons --
     table:false keeps the styling but leaves out freezing and filters);
     numbers stay numbers, null/undefined cells are left empty.
   xlsxDownload(sheets, fileName) saves the workbook.
   ============================================================ */

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function xlsxEsc(v){
  // XML 1.0 cannot hold most control characters at all: drop them.
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function xlsxCol(i){
  let s = '';
  for(i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s;
  return s;
}
// Sheet names: at most 31 characters, none of []:*?/\ and unique in the workbook.
function xlsxSheetNames(sheets){
  const used = {};
  return sheets.map(function(sh, i){
    let base = String(sh.name || ('Sheet' + (i + 1))).replace(/[\[\]:*?\/\\]/g, ' ').trim().slice(0, 31) || ('Sheet' + (i + 1));
    let name = base, n = 2;
    while(used[name.toLowerCase()]){ const suf = ' (' + n++ + ')'; name = base.slice(0, 31 - suf.length) + suf; }
    used[name.toLowerCase()] = true;
    return name;
  });
}

function xlsxSheetXML(sheet){
  const rows = sheet.rows || [];
  const ncol = rows.reduce(function(m, r){ return Math.max(m, r.length); }, 0);
  // Column widths from the longest value (in characters), within sensible bounds.
  const widths = [];
  for(let c = 0; c < ncol; c++){
    const given = sheet.widths && sheet.widths[c];
    let w = 8;
    rows.forEach(function(r){ const v = r[c]; if(v != null) w = Math.max(w, String(v).length + 2); });
    widths.push(given || Math.min(w, 60));
  }
  const body = rows.map(function(r, ri){
    const cells = r.map(function(v, ci){
      if(v == null || v === '') return '';
      const ref = xlsxCol(ci) + (ri + 1), style = ri === 0 ? ' s="1"' : ' s="2"';
      if(typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + style + '><v>' + v + '</v></c>';
      return '<c r="' + ref + '"' + style + ' t="inlineStr"><is><t xml:space="preserve">' + xlsxEsc(v) + '</t></is></c>';
    }).join('');
    return '<row r="' + (ri + 1) + '">' + cells + '</row>';
  }).join('');
  const lastRef = xlsxCol(Math.max(ncol, 1) - 1) + Math.max(rows.length, 1);
  const table = sheet.table !== false && rows.length > 1 && ncol > 0;
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0">' +
    (table ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : '') +
    '</sheetView></sheetViews>' +
    (ncol ? '<cols>' + widths.map(function(w, i){ return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('') + '</cols>' : '') +
    '<sheetData>' + body + '</sheetData>' +
    (table ? '<autoFilter ref="A1:' + lastRef + '"/>' : '') +
    '</worksheet>';
}

function xlsxFiles(sheets){
  const names = xlsxSheetNames(sheets);
  const files = [];
  files.push(['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    sheets.map(function(s, i){ return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') +
    '</Types>']);
  files.push(['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>']);
  files.push(['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets>' + names.map(function(n, i){ return '<sheet name="' + xlsxEsc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets>' +
    // A filter range per sheet, as Excel itself writes it beside an autoFilter.
    '<definedNames>' + sheets.map(function(s, i){
      const rows = s.rows || [], ncol = rows.reduce(function(m, r){ return Math.max(m, r.length); }, 0);
      if(s.table === false || rows.length < 2 || !ncol) return '';
      return '<definedName name="_xlnm._FilterDatabase" localSheetId="' + i + '" hidden="1">\'' + xlsxEsc(names[i].replace(/'/g, "''")) + '\'!$A$1:$' + xlsxCol(ncol - 1) + '$' + rows.length + '</definedName>';
    }).join('') + '</definedNames>' +
    '</workbook>']);
  files.push(['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheets.map(function(s, i){ return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') +
    '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>']);
  // Styles: 0 default, 1 header (bold, white on the iroli indigo), 2 body (top-aligned, wrapped).
  files.push(['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF5A4BE0"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="3">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>']);
  sheets.forEach(function(s, i){ files.push(['xl/worksheets/sheet' + (i + 1) + '.xml', xlsxSheetXML(s)]); });
  return files;
}

/* ---- zip (stored, no compression) ---- */
let XLSX_CRC_TABLE = null;
function xlsxCrc32(bytes){
  if(!XLSX_CRC_TABLE){
    XLSX_CRC_TABLE = new Uint32Array(256);
    for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; XLSX_CRC_TABLE[n] = c >>> 0; }
  }
  let crc = 0xFFFFFFFF;
  for(let i = 0; i < bytes.length; i++) crc = XLSX_CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function xlsxZip(files){
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  const u16 = function(v){ return [v & 0xFF, (v >>> 8) & 0xFF]; };
  const u32 = function(v){ return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; };
  // 1 Jan 2026, 00:00 -- a fixed timestamp, so the same data gives the same file.
  const DOS_TIME = 0, DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
  files.forEach(function(f){
    const name = enc.encode(f[0]), data = enc.encode(f[1]), crc = xlsxCrc32(data);
    const common = [].concat(u16(20), u16(0x0800), u16(0), u16(DOS_TIME), u16(DOS_DATE), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
    const local = new Uint8Array([].concat(u32(0x04034B50), common));
    parts.push(local, name, data);
    central.push(new Uint8Array([].concat(u32(0x02014B50), u16(20), common, u16(0), u16(0), u16(0), u32(0), u32(offset))), name);
    offset += local.length + name.length + data.length;
  });
  const cdSize = central.reduce(function(s, p){ return s + p.length; }, 0);
  const end = new Uint8Array([].concat(u32(0x06054B50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cdSize), u32(offset), u16(0)));
  const all = parts.concat(central, [end]);
  const out = new Uint8Array(all.reduce(function(s, p){ return s + p.length; }, 0));
  let at = 0;
  all.forEach(function(p){ out.set(p, at); at += p.length; });
  return out;
}

function xlsxBuild(sheets){ return xlsxZip(xlsxFiles(sheets)); }

function xlsxDownload(sheets, fileName){
  const blob = new Blob([xlsxBuild(sheets)], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
}
