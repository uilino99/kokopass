import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../hooks/useAuth.js';
import { listBatchesByOwner } from '../utils/firestore.js';
import { FullPageSpinner } from '../components/Spinner.jsx';

export default function BatchPrint() {
  const { user } = useAuth();
  const [batches, setBatches] = useState(null);
  const [grade, setGrade] = useState('all');
  const [copies, setCopies] = useState(1);

  useEffect(() => {
    let active = true;
    listBatchesByOwner(user.uid)
      .then((rows) => {
        if (active) setBatches(rows);
      })
      .catch(() => {
        if (active) setBatches([]);
      });
    return () => {
      active = false;
    };
  }, [user.uid]);

  const grades = useMemo(() => {
    if (!batches) return [];
    return Array.from(new Set(batches.map((b) => b.quality).filter(Boolean))).sort();
  }, [batches]);

  const filtered = useMemo(() => {
    if (!batches) return [];
    return grade === 'all' ? batches : batches.filter((b) => b.quality === grade);
  }, [batches, grade]);

  const expanded = useMemo(() => {
    const n = Math.max(1, Math.min(20, Number(copies) || 1));
    const out = [];
    filtered.forEach((b) => {
      for (let i = 0; i < n; i += 1) {
        out.push({ ...b, _copyKey: `${b.id}_${i}` });
      }
    });
    return out;
  }, [filtered, copies]);

  if (!batches) return <FullPageSpinner label="Loading your batches" />;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="page">
      <header className="no-print container-app pt-2 pb-6 animate-slide-up">
        <p className="eyebrow">Bag labels</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
          Print batch QR labels
        </h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          A printable A4 sheet of QR labels for your bags. Cut along the dashes and stick on
          each bag — buyers scan the code to verify the batch.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-koko-body">
            <span>Grade</span>
            <select
              className="input !min-h-[40px] !py-2 !w-auto"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option value="all">All ({batches.length})</option>
              {grades.map((g) => (
                <option key={g} value={g}>
                  Grade {g} ({batches.filter((b) => b.quality === g).length})
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-koko-body">
            <span>Copies per batch</span>
            <input
              type="number"
              min="1"
              max="20"
              className="input !min-h-[40px] !py-2 !w-20"
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
            />
          </label>
          <span className="text-sm text-koko-muted">
            {expanded.length} label{expanded.length === 1 ? '' : 's'} · 9 per A4 page
          </span>
          <div className="ml-auto flex gap-2">
            <Link to="/dashboard" className="btn-secondary">← Back</Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-accent"
              disabled={expanded.length === 0}
            >
              🖨 Print {expanded.length} label{expanded.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </header>

      {expanded.length === 0 ? (
        <div className="no-print card text-center">
          <p className="text-koko-muted">
            No batches to print yet.{' '}
            <Link to="/batches/new" className="text-koko-teal hover:underline">
              Record one
            </Link>
            .
          </p>
        </div>
      ) : (
        <main className="label-sheet">
          {expanded.map((b) => (
            <BatchLabel key={b._copyKey} batch={b} origin={origin} />
          ))}
        </main>
      )}
    </div>
  );
}

function BatchLabel({ batch, origin }) {
  const url = `${origin}/verify/${batch.id}`;
  return (
    <article className="label-card">
      <div className="label-body">
        <div className="label-head">
          <img src="/icon.svg" alt="" />
          <span>
            Koko<span style={{ color: '#1D9E75' }}>Pass</span>
          </span>
        </div>
        <div className="label-qr">
          <QRCodeCanvas value={url} size={220} level="H" includeMargin={false} fgColor="#003366" />
        </div>
        <div>
          <div className="label-farm">{batch.farmName || '—'}</div>
          <div className="label-meta">
            {batch.village || ''}
            {batch.weightKg ? ` · ${batch.weightKg} kg` : ''}
            {batch.quality ? ` · Grade ${batch.quality}` : ''}
          </div>
          <div className="label-id">{batch.id.slice(0, 12)}…</div>
        </div>
      </div>
    </article>
  );
}
