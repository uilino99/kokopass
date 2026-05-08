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
