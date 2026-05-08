import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../hooks/useAuth.js';
import { subscribeEnrollmentsByEnroller } from '../utils/firestore.js';
import { FullPageSpinner } from '../components/Spinner.jsx';

export default function EnrollPrint() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [village, setVillage] = useState('all');

  useEffect(() => {
    return subscribeEnrollmentsByEnroller(user.uid, (list) => {
      setRows(list);
      setLoading(false);
    });
  }, [user.uid]);

  const unclaimed = useMemo(() => rows.filter((r) => !r.claimed), [rows]);
  const villages = useMemo(
    () => Array.from(new Set(unclaimed.map((r) => r.village).filter(Boolean))).sort(),
    [unclaimed]
  );
  const filtered = useMemo(
    () => (village === 'all' ? unclaimed : unclaimed.filter((r) => r.village === village)),
    [unclaimed, village]
  );

  if (loading) return <FullPageSpinner label="Loading roster" />;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="page">
      {/* Controls — hidden when printing */}
      <header className="no-print container-app pt-2 pb-6 animate-slide-up">
        <p className="eyebrow">Field cards</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">Print claim cards</h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          A printable A4 sheet of QR claim cards. Hand one to each pre-enrolled farmer — they
          scan the QR to register and inherit their farm record automatically.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-koko-body">
            <span>Village</span>
            <select
              className="input !min-h-[40px] !py-2 !w-auto"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
            >
              <option value="all">All ({unclaimed.length})</option>
              {villages.map((v) => (
                <option key={v} value={v}>
                  {v} ({unclaimed.filter((r) => r.village === v).length})
                </option>
              ))}
            </select>
          </label>
          <span className="text-sm text-koko-muted">
            {filtered.length} card{filtered.length === 1 ? '' : 's'} · 8 per A4 page
          </span>
          <div className="ml-auto flex gap-2">
            <Link to="/enroll" className="btn-secondary">← Back</Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-accent"
              disabled={filtered.length === 0}
            >
              🖨 Print {filtered.length} card{filtered.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="no-print card text-center">
          <p className="text-koko-muted">No unclaimed enrollments to print.</p>
        </div>
      ) : (
        <main className="print-sheet">
          {filtered.map((r) => (
            <ClaimCard key={r.id} enrollment={r} origin={origin} />
          ))}
        </main>
      )}
    </div>
  );
}

function ClaimCard({ enrollment, origin }) {
  const url = `${origin}/claim/${enrollment.claimCode}`;
  return (
    <article className="print-card">
      <div className="print-card-body">
        <div className="print-card-head">
          <div className="print-card-brand">
            <img src="/icon.svg" alt="" className="print-card-logo" />
            <div>
              <div className="print-card-wordmark">
                Koko<span style={{ color: '#1D9E75' }}>Pass</span>
              </div>
              <div className="print-card-eyebrow">Samoa cacao · Pre-enrolled</div>
            </div>
          </div>
          <div className="print-card-qr">
            <QRCodeCanvas
              value={url}
              size={140}
              level="H"
              includeMargin={false}
              fgColor="#003366"
            />
          </div>
        </div>

        <div className="print-card-name">{enrollment.fullName || '—'}</div>
        <div className="print-card-meta">
          {enrollment.village || '—'}
          {enrollment.district ? ` · ${enrollment.district}` : ''}
        </div>

        <div className="print-card-foot">
          <div>
            <div className="print-card-label">Claim code</div>
            <div className="print-card-code">{enrollment.claimCode}</div>
          </div>
          <div className="print-card-instructions">
            Scan the QR or visit
            <br />
            <span className="print-card-url">
              {origin.replace(/^https?:\/\//, '')}/claim/{enrollment.claimCode}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
