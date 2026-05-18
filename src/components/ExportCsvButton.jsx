import { useState } from 'react';
import { downloadCsv, toCsv } from '../utils/csv.js';
import Spinner from './Spinner.jsx';

/**
 * Reusable "Export CSV" button. Accepts:
 *   rows       — the array to export
 *   columns    — [{ header, field?, value? }, …] passed to toCsv
 *   filename   — e.g. "kokopass-batches-2025-01.csv"
 *   label      — button copy (default "Export CSV")
 *   className  — pass-through (default btn-secondary)
 *
 * Disabled when there are no rows. Renders a tiny spinner while
 * generating + downloading (instantaneous in practice; the state is
 * there for future async exports that fetch the full table first).
 */
export default function ExportCsvButton({
  rows,
  columns,
  filename,
  label = 'Export CSV',
  className = 'btn-secondary'
}) {
  const [busy, setBusy] = useState(false);
  const count = Array.isArray(rows) ? rows.length : 0;
  const disabled = busy || count === 0 || !columns?.length;

  const onClick = () => {
    if (disabled) return;
    setBusy(true);
    try {
      const csv = toCsv(rows, columns);
      const stamp = new Date().toISOString().slice(0, 10);
      const finalName =
        filename || `kokopass-${stamp}.csv`;
      downloadCsv(
        finalName.endsWith('.csv') ? finalName : `${finalName}.csv`,
        csv
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      title={count === 0 ? 'Nothing to export' : `Export ${count} row${count === 1 ? '' : 's'}`}
    >
      {busy ? <Spinner size="sm" /> : '⬇'}{' '}
      {busy ? 'Exporting…' : `${label}${count > 0 ? ` · ${count}` : ''}`}
    </button>
  );
}
