import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { subscribeScansByOwner } from '../utils/firestore.js';
import { Skeleton, SkeletonCard } from '../components/Skeleton.jsx';

const KIND_OPTIONS = [
  { value: 'all', label: 'All scans' },
  { value: 'batch', label: 'Batches only' },
  { value: 'shipment', label: 'Shipments only' }
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'heaviest', label: 'Heaviest first' }
];

export default function BuyerDashboard() {
  const { user, profile } = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const [sort, setSort] = useState('recent');

  useEffect(() => {
    const unsub = subscribeScansByOwner(user.uid, (rows) => {
      setScans(rows);
      setLoading(false);
    });
    return unsub;
  }, [user.uid]);

  const stats = useMemo(() => {
    let totalKg = 0;
    let bags = 0;
    const farms = new Set();
    let shipments = 0;
    for (const s of scans) {
      const sum = s.summary || {};
      if (s.refKind === 'shipment') {
        shipments += 1;
        totalKg += Number(sum.totalKg) || 0;
        bags += Number(sum.batchesCount) || 0;
        // farms in shipment summary too
        if (Number.isFinite(sum.farmsCount)) {
          // approximate — we don't have farm IDs here, so this is informational
        }
      } else {
        bags += 1;
        totalKg += Number(sum.weightKg) || 0;
        if (sum.farmName) farms.add(sum.farmName);
      }
    }
    return { totalKg, bags, farms: farms.size, shipments };
  }, [scans]);

  const filteredScans = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = scans.filter((s) => {
      if (kind !== 'all' && (s.refKind || 'batch') !== kind) return false;
      if (!q) return true;
      const sum = s.summary || {};
      const haystack = [
        s.refId,
        sum.farmName,
        sum.village,
        sum.destination,
        sum.buyerName,
        sum.quality
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
    if (sort === 'oldest') {
      rows = [...rows].sort((a, b) => secondsOf(a.scannedAt) - secondsOf(b.scannedAt));
    } else if (sort === 'heaviest') {
      rows = [...rows].sort((a, b) => weightOf(b) - weightOf(a));
    }
    // 'recent' is the default Firestore order — no sort needed.
    return rows;
  }, [scans, search, kind, sort]);

  const firstName = profile?.fullName?.split(' ')[0] || 'partner';

  return (
    <div className="space-y-10">
      <header className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end animate-slide-up">
        <div>
          <p className="eyebrow">Buyer portfolio</p>
          <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
            Talofa, <span className="italic text-koko-teal">{firstName}</span>
          </h1>
          <p className="mt-2 max-w-lg text-sm text-koko-body">
            Every QR you scan is saved here — your verified single-origin portfolio.
          </p>
        </div>
        <Link to="/buyer/scan" className="btn-accent">+ Scan a pass</Link>
      </header>

      <div className="grid gap-5 sm:grid-cols-4">
        <Stat label="Bags traced" value={loading ? null : stats.bags} sub="Including shipments" />
        <Stat label="Total kg traced" value={loading ? null : `${stats.totalKg.toFixed(1)} kg`} sub="Verified provenance" />
        <Stat label="Unique farms" value={loading ? null : stats.farms} sub="In your portfolio" />
        <Stat label="Shipments" value={loading ? null : stats.shipments} sub="Consignments scanned" />
      </div>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow">Recent</p>
            <h2 className="mt-1 font-display text-2xl text-koko-ink sm:text-3xl">Your scans</h2>
          </div>
          <Link to="/buyer/scan" className="btn-ghost">+ Scan</Link>
        </div>

        {!loading && scans.length > 0 && (
          <div className="card mb-5 animate-slide-up">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                className="input flex-1"
                placeholder="Search farm, village, destination, batch ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="input sm:!w-44"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                {KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                className="input sm:!w-44"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <p className="helper mt-2">
              Showing {filteredScans.length} of {scans.length} scan
              {scans.length === 1 ? '' : 's'}
              {(search || kind !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setKind('all');
                  }}
                  className="ml-2 text-koko-teal hover:underline"
                >
                  Clear filters
                </button>
              )}
            </p>
          </div>
        )}

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && scans.length === 0 && (
          <div className="card text-center animate-slide-up">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-koko-teal100 text-koko-teal">
              <span className="text-xl">🔎</span>
            </div>
            <p className="eyebrow mt-4">No scans yet</p>
            <p className="mt-2 text-koko-body">
              Scan any KokoPass QR and it'll appear here automatically.
            </p>
            <div className="mt-5">
              <Link to="/buyer/scan" className="btn-accent">Scan first QR</Link>
            </div>
          </div>
        )}

        {!loading && scans.length > 0 && filteredScans.length === 0 && (
          <div className="card text-center text-koko-muted">
            No scans match those filters.
          </div>
        )}

        {!loading && filteredScans.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {filteredScans.map((s, i) => (
              <li
                key={s.id}
                className="animate-slide-up"
                style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
              >
                <Link to={`/verify/${s.refId}`} className="card-hover block">
                  <div className="flex items-center justify-between">
                    <span className="badge-navy capitalize">{s.refKind || 'batch'}</span>
                    <span className="text-2xs text-koko-faint">
                      {fmtTime(s.scannedAt)}
                    </span>
                  </div>

                  {s.refKind === 'shipment' ? (
                    <ShipmentSummary s={s} />
                  ) : (
                    <BatchSummary s={s} />
                  )}

                  <div className="divider !my-4" />
                  <p className="font-mono text-2xs text-koko-faint break-all">
                    {s.refId}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BatchSummary({ s }) {
  const sum = s.summary || {};
  return (
    <>
      <h3 className="mt-4 font-display text-2xl text-koko-ink">
        {sum.farmName || 'Unknown farm'}
      </h3>
      <p className="mt-1 text-sm text-koko-body">
        {sum.village ? `${sum.village} · ` : ''}
        {sum.weightKg ? `${sum.weightKg} kg` : ''}
        {sum.quality ? ` · Grade ${sum.quality}` : ''}
      </p>
      {sum.harvestDate && (
        <p className="mt-1 text-xs text-koko-muted">Harvested {sum.harvestDate}</p>
      )}
    </>
  );
}

function ShipmentSummary({ s }) {
  const sum = s.summary || {};
  return (
    <>
      <h3 className="mt-4 font-display text-2xl text-koko-ink">
        {sum.destination || 'Shipment'}
      </h3>
      <p className="mt-1 text-sm text-koko-body">
        {sum.totalKg != null ? `${Number(sum.totalKg).toFixed(1)} kg` : ''}
        {sum.batchesCount != null ? ` · ${sum.batchesCount} batches` : ''}
        {sum.farmsCount != null ? ` · ${sum.farmsCount} farms` : ''}
      </p>
      {sum.buyerName && (
        <p className="mt-1 text-xs text-koko-muted">to {sum.buyerName}</p>
      )}
    </>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="card animate-slide-up">
      <p className="eyebrow">{label}</p>
      <div className="mt-2 font-display text-3xl text-koko-ink sm:text-4xl">
        {value === null ? <Skeleton className="h-9 w-24" /> : value}
      </div>
      {sub && <p className="mt-1 text-xs text-koko-muted">{sub}</p>}
    </div>
  );
}

function secondsOf(ts) {
  if (!ts) return 0;
  if (typeof ts.seconds === 'number') return ts.seconds;
  if (ts.toDate) return Math.floor(ts.toDate().getTime() / 1000);
  return 0;
}

function weightOf(s) {
  const sum = s.summary || {};
  if (s.refKind === 'shipment') return Number(sum.totalKg) || 0;
  return Number(sum.weightKg) || 0;
}

function fmtTime(ts) {
  // Firestore Timestamp -> human, falls back gracefully if pending writes
  if (!ts) return 'just now';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}
