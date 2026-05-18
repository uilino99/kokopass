/**
 * Minimal CSV parser. Handles quoted fields, embedded commas, escaped
 * double-quotes ("") and CRLF / LF line endings. Returns an array of
 * arrays (no header processing).
 */
export function parseCsv(input) {
  if (!input) return [];
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const s = String(input).replace(/\r\n/g, '\n');

  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
  }
  // flush
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 0 && r.some((v) => v && v.trim() !== ''));
}

/**
 * Map a parsed CSV (with optional header row) into typed records using a
 * provided header schema. If the first row's first cell is a known
 * header, that row is treated as the header; otherwise we fall back to
 * positional mapping in `headers` order.
 */
/**
 * Render `rows` as a CSV string using `columns` to control header
 * labels and per-field value extraction.
 *
 *   const csv = toCsv(myRows, [
 *     { header: 'Name', value: r => r.fullName },
 *     { header: 'Created', value: r => fmtDate(r.createdAt) }
 *   ]);
 *
 * Escapes fields containing commas, quotes or newlines per RFC 4180.
 * Returns an empty string if either `rows` or `columns` is empty.
 */
export function toCsv(rows, columns) {
  if (!Array.isArray(rows) || !Array.isArray(columns) || columns.length === 0) {
    return '';
  }
  const esc = (v) => {
    if (v == null) return '';
    let s = typeof v === 'string' ? v : String(v);
    s = s.replace(/\r?\n/g, ' ').trim();
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      s = `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [columns.map((c) => esc(c.header)).join(',')];
  for (const row of rows) {
    lines.push(
      columns
        .map((c) => {
          try {
            return esc(c.value ? c.value(row) : row?.[c.field] ?? '');
          } catch {
            return '';
          }
        })
        .join(',')
    );
  }
  // Excel-safe BOM so non-ASCII (Samoan names with apostrophes etc.)
  // opens correctly.
  return '﻿' + lines.join('\n');
}

/**
 * Browser-only: serialize a CSV string into a Blob and trigger a
 * download. Caller picks the filename.
 */
export function downloadCsv(filename, csv) {
  if (typeof document === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Format a Firestore Timestamp / Date / iso-ish value for CSV. Returns
 * '' when missing. Defaults to ISO so spreadsheets sort correctly.
 */
export function fmtCsvDate(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString();
  } catch {
    return '';
  }
}

export function csvToRecords(rows, headers) {
  if (rows.length === 0) return [];
  const lower = (s) => String(s || '').trim().toLowerCase();
  const first = rows[0].map(lower);
  const hasHeader = headers.some((h) => first.includes(lower(h)));

  let order;
  let body;
  if (hasHeader) {
    order = first.map((h) => headers.findIndex((k) => lower(k) === h));
    body = rows.slice(1);
  } else {
    order = headers.map((_, i) => i);
    body = rows;
  }

  return body.map((cells) => {
    const rec = {};
    headers.forEach((key, idx) => {
      const colIdx = hasHeader ? order.indexOf(idx) : idx;
      const val = colIdx >= 0 ? cells[colIdx] : '';
      rec[key] = (val ?? '').toString().trim();
    });
    return rec;
  });
}
