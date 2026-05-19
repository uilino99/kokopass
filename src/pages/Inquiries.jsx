import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import {
  subscribeInquiriesForTarget,
  updateInquiry
} from '../utils/firestore.js';
import { Skeleton, SkeletonCard } from '../components/Skeleton.jsx';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'archived', label: 'Archived' }
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'oldest', label: 'Oldest first' }
];

export default function Inquiries() {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recent');

  useEffect(() => {
    const unsub = subscribeInquiriesForTarget(user.uid, (list) => {
      setRows(list);
      setLoading(false);
    });
    return unsub;
  }, [user.uid]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (status !== 'all' && (r.status || 'new') !== status) return false;
      if (!q) return true;
      const haystack = [
        r.name,
        r.email,
        r.phone,
        r.company,
        r.message,
        r.variety,
        r.destination,
        r.qualityGrade,
        r.currency
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
    if (sort === 'oldest') {
      out = [...out].sort((a, b) => secondsOf(a.createdAt) - secondsOf(b.createdAt));
    }
    return out;
  }, [rows, search, status, sort]);

  const counts = useMemo(() => {
    const c = { all: rows.length, new: 0, read: 0, archived: 0 };
    rows.forEach((r) => {
      c[r.status || 'new'] = (c[r.status || 'new'] || 0) + 1;
    });
    return c;
  }, [rows]);

  const setStatusFor = async (id, next) => {
    try {
      await updateInquiry(id, { targetUid: user.uid, status: next });
    } catch (err) {
      toast.error(err.message || 'Could not update.');
    }
  };

  return (
    <div className="space-y-8 page">
      <header className="animate-slide-up">
        <p className="eyebrow">Inbox</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
          Inquiries
          {counts.new > 0 && (
            <span className="ml-3 align-middle">
              <span className="badge-error">{counts.new} new</span>
            </span>
          )}
        </h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Every message sent from your public profile and from buyers asking about specific
          shipments. Reply via the contact details, or archive once handled.
        </p>
      </header>

      <section className="card animate-slide-up">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            className="input flex-1"
            placeholder="Search name, company, email, message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input sm:!w-44"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label} ({counts[s.value] ?? 0})
              </option>
            ))}
          </select>
          <select
            className="input sm:!w-44"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <p className="helper mt-2">
          Showing {filtered.length} of {rows.length} inquir{rows.length === 1 ? 'y' : 'ies'}
          {(search || status !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatus('all');
              }}
              className="ml-2 text-koko-teal hover:underline"
            >
              Clear filters
            </button>
          )}
        </p>
      </section>

      {loading && (
        <div className="grid gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="card text-center text-koko-muted">
          No inquiries yet. Share your{' '}
          <Link to={`/exporters/${user.uid}`} className="text-koko-teal hover:underline">
            public profile
          </Link>{' '}
          to start collecting leads.
        </div>
      )}

      {!loading && rows.length > 0 && filtered.length === 0 && (
        <div className="card text-center text-koko-muted">
          No inquiries match those filters.
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="grid gap-3">
          {filtered.map((q) => (
            <li
              key={q.id}
              className={`card animate-slide-up ${
                q.status === 'new' ? 'border-koko-teal/40 bg-koko-teal100/30' : ''
              } ${q.status === 'archived' ? 'opacity-70' : ''}`}
            >
              <div className="flex flex-wrap items-baseline gap-2">
                {q.kind === 'order' && (
                  <span className="badge-teal mr-1">RFQ</span>
                )}
                <span className="font-semibold text-koko-ink">{q.name}</span>
                {q.company && (
                  <span className="text-sm text-koko-muted">· {q.company}</span>
                )}
                <span className="ml-auto text-2xs text-koko-faint">
                  {q.status === 'new' && <span className="badge-error mr-2">New</span>}
                  {q.status === 'read' && <span className="badge-navy mr-2">Read</span>}
                  {q.status === 'archived' && <span className="badge-navy mr-2">Archived</span>}
                  {fmtTime(q.createdAt)}
                </span>
              </div>

              {q.kind === 'order' && (
                <RfqSummary q={q} />
              )}

              <p className="mt-2 whitespace-pre-line text-sm text-koko-body">
                {q.message}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-koko-muted">
                {q.email && (
                  <a
                    href={`mailto:${q.email}?subject=Re: your KokoPass inquiry`}
                    className="btn-secondary !min-h-[32px] !px-3 !py-1 text-xs"
                  >
                    ✉ {q.email}
                  </a>
                )}
                {q.phone && (
                  <a
                    href={`tel:${q.phone}`}
                    className="btn-secondary !min-h-[32px] !px-3 !py-1 text-xs"
                  >
                    ☎ {q.phone}
                  </a>
                )}
                {q.shipmentId && (
                  <Link
                    to={`/exporter/shipments/${q.shipmentId}`}
                    className="btn-ghost !min-h-[32px] !px-2 !py-1 text-xs"
                  >
                    ↗ Shipment
                  </Link>
                )}
                <span className="ml-auto flex gap-1">
                  {q.status === 'new' && (
                    <button
                      type="button"
                      onClick={() => setStatusFor(q.id, 'read')}
                      className="btn-ghost !min-h-[32px] !px-2 !py-1 text-xs"
                    >
                      Mark read
                    </button>
                  )}
                  {q.status === 'read' && (
                    <button
                      type="button"
                      onClick={() => setStatusFor(q.id, 'new')}
                      className="btn-ghost !min-h-[32px] !px-2 !py-1 text-xs"
                    >
                      Mark unread
                    </button>
                  )}
                  {q.status !== 'archived' ? (
                    <button
                      type="button"
                      onClick={() => setStatusFor(q.id, 'archived')}
                      className="btn-ghost !min-h-[32px] !px-2 !py-1 text-xs"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStatusFor(q.id, 'read')}
                      className="btn-ghost !min-h-[32px] !px-2 !py-1 text-xs"
                    >
                      Restore
                    </button>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RfqSummary({ q }) {
  const items = [
    q.quantityKg != null && {
      label: 'Quantity',
      value: `${Number(q.quantityKg).toLocaleString()} kg`
    },
    q.qualityGrade && {
      label: 'Grade',
      value: q.qualityGrade === 'any' ? 'Any' : `Grade ${q.qualityGrade}`
    },
    q.variety && { label: 'Variety', value: q.variety },
    q.targetPrice != null && {
      label: 'Target',
      value: `${q.currency || 'USD'} ${Number(q.targetPrice).toFixed(2)}/kg`
    },
    q.deliveryDate && { label: 'Deliver by', value: q.deliveryDate },
    q.destination && { label: 'To', value: q.destination }
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <dl className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-koko-teal/30 bg-koko-teal100/30 p-3 text-xs sm:grid-cols-3">
      {items.map((it) => (
        <div key={it.label}>
          <dt className="text-2xs uppercase tracking-widest text-koko-muted">
            {it.label}
          </dt>
          <dd className="mt-0.5 font-medium text-koko-ink">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function secondsOf(ts) {
  if (!ts) return 0;
  if (typeof ts.seconds === 'number') return ts.seconds;
  if (ts.toDate) return Math.floor(ts.toDate().getTime() / 1000);
  return 0;
}

function fmtTime(ts) {
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
