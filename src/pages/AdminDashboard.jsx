import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import {
  fetchAdminStats,
  fetchAggregateCounts,
  fetchAuditLogs
} from '../utils/firestore.js';
import { FullPageSpinner } from '../components/Spinner.jsx';
import { Skeleton } from '../components/Skeleton.jsx';
import AdminNav from '../components/AdminNav.jsx';
import AdminGate from '../components/AdminGate.jsx';

export default function AdminDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [counts, setCounts] = useState(null);
  const [recent, setRecent] = useState(null);

  useEffect(() => {
    if (profile?.admin !== true) return;
    let active = true;
    fetchAdminStats().then((s) => active && setStats(s)).catch(() => active && setStats({}));
    fetchAggregateCounts().then((c) => active && setCounts(c)).catch(() => active && setCounts({}));
    fetchAuditLogs({ max: 10 }).then((r) => active && setRecent(r)).catch(() => active && setRecent([]));
    return () => {
      active = false;
    };
  }, [profile?.admin]);

  if (authLoading) return <FullPageSpinner label="Loading" />;

  return (
    <AdminGate>
      <div className="space-y-8 page">
        <AdminNav />

        <header className="animate-slide-up">
          <p className="eyebrow">Internal</p>
          <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
            Platform overview
          </h1>
          <div className="divider-teal mt-4 ml-0" />
          <p className="mt-4 text-sm text-koko-body">
            Pilot-wide health snapshot. For per-org or per-user moderation, dive into the
            audit log and the user / org browsers in the tabs above.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Users" value={stats?.users} sub="All roles" />
          <Stat label="Organizations" value={stats?.organizations} sub="All types" />
          <Stat label="Farms" value={counts?.farms} sub="Verified farm profiles" />
          <Stat label="Batches" value={counts?.batches} sub="Provenance passes minted" />
          <Stat label="Shipments" value={counts?.shipments} sub="Consignments minted" />
          <Stat label="Scans" value={stats?.scans} sub="Buyer portfolio entries" />
          <Stat label="Inquiries" value={stats?.inquiries} sub="Lead-capture submissions" />
          <Stat label="Audit log rows" value={stats?.auditLogs} sub="Server-written history" />
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="eyebrow">Activity</p>
              <h2 className="mt-1 font-display text-2xl text-koko-ink sm:text-3xl">
                Recent changes
              </h2>
            </div>
            <Link to="/admin/audit" className="btn-ghost">Open full log →</Link>
          </div>
          {recent === null && <div className="card text-koko-muted">Loading…</div>}
          {recent && recent.length === 0 && (
            <div className="card text-koko-muted">No audit-log rows yet.</div>
          )}
          {recent && recent.length > 0 && (
            <ul className="grid gap-2">
              {recent.map((r) => (
                <AuditRow key={r.id} row={r} compact />
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminGate>
  );
}

export function AuditRow({ row, compact = false }) {
  const tone =
    row.action === 'create'
      ? 'badge-success'
      : row.action === 'delete'
        ? 'badge-error'
        : 'badge-navy';
  return (
    <li className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className={tone}>{row.action}</span>
          <span className="font-mono text-xs text-koko-ink">{row.collection}</span>
          <span className="font-mono text-2xs text-koko-faint">{row.docId}</span>
        </div>
        <span className="text-2xs text-koko-faint">{fmtTs(row.at)}</span>
      </div>
      {!compact && (
        <div className="mt-2 grid gap-2 sm:grid-cols-3 text-xs text-koko-muted">
          <Field label="Actor" value={row.actorUid} mono />
          <Field label="Org" value={row.orgId || '—'} mono />
          <Field
            label="Changed"
            value={row.diff?.length ? row.diff.join(', ') : '—'}
          />
        </div>
      )}
      {compact && row.diff?.length > 0 && (
        <p className="mt-1 text-2xs text-koko-muted">
          {row.diff.slice(0, 4).join(', ')}
          {row.diff.length > 4 ? '…' : ''}
        </p>
      )}
    </li>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-widest text-koko-muted">{label}</div>
      <div className={`mt-0.5 text-koko-ink ${mono ? 'font-mono break-all' : ''}`}>{value}</div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="card">
      <p className="eyebrow">{label}</p>
      <div className="mt-2 font-display text-3xl text-koko-ink sm:text-4xl">
        {value == null ? <Skeleton className="h-9 w-20" /> : value.toLocaleString?.() ?? value}
      </div>
      {sub && <p className="mt-1 text-xs text-koko-muted">{sub}</p>}
    </div>
  );
}

function fmtTs(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return d.toLocaleString();
}
