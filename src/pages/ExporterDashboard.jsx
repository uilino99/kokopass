import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import {
  subscribeExportsByOwner,
  subscribeInquiriesForTarget,
  updateInquiry
} from '../utils/firestore.js';
import { Skeleton, SkeletonCard } from '../components/Skeleton.jsx';

export default function ExporterDashboard() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inquiries, setInquiries] = useState([]);
  const [inqLoading, setInqLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeExportsByOwner(user.uid, (rows) => {
      setShipments(rows);
      setLoading(false);
    });
    return unsub;
  }, [user.uid]);

  useEffect(() => {
    const unsub = subscribeInquiriesForTarget(user.uid, (rows) => {
      setInquiries(rows);
      setInqLoading(false);
    });
    return unsub;
  }, [user.uid]);

  const unreadInquiries = inquiries.filter((i) => i.status === 'new').length;

  const markRead = async (id) => {
    try {
      await updateInquiry(id, { targetUid: user.uid, status: 'read' });
    } catch (err) {
      toast.error(err.message || 'Could not update.');
    }
  };

  const archive = async (id) => {
    try {
      await updateInquiry(id, { targetUid: user.uid, status: 'archived' });
    } catch (err) {
      toast.error(err.message || 'Could not archive.');
    }
  };

  const totalKg = shipments.reduce((acc, s) => acc + (Number(s.totalKg) || 0), 0);
  const totalBatches = shipments.reduce((acc, s) => acc + (s.batchIds?.length || 0), 0);
  const firstName = profile?.fullName?.split(' ')[0] || 'partner';

  return (
    <div className="space-y-10">
      <header className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end animate-slide-up">
        <div>
          <p className="eyebrow">Exporter desk</p>
          <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
            Talofa, <span className="italic text-koko-teal">{firstName}</span>
          </h1>
          <p className="mt-2 max-w-lg text-sm text-koko-body">
            Aggregate verified farmer batches into shipments and mint a single QR for each
            consignment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/exporter/profile" className="btn-secondary">Edit profile</Link>
          <Link to="/exporter/shipments/new" className="btn-accent">+ New shipment</Link>
        </div>
      </header>

      <div className="grid gap-5 sm:grid-cols-4">
        <Stat label="Shipments" value={loading ? null : shipments.length} sub="Consignments minted" />
        <Stat label="Batches aggregated" value={loading ? null : totalBatches} sub="Across all shipments" />
        <Stat label="Total exported" value={loading ? null : `${totalKg.toFixed(1)} kg`} sub="Verified cacao" />
        <Stat
          label="Inquiries"
          value={inqLoading ? null : inquiries.length}
          sub={unreadInquiries ? `${unreadInquiries} unread` : 'All caught up'}
        />
      </div>

      {/* Inquiries inbox */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow">Inbox</p>
            <h2 className="mt-1 font-display text-2xl text-koko-ink sm:text-3xl">
              Inquiries
              {unreadInquiries > 0 && (
                <span className="ml-2 align-middle">
                  <span className="badge-error">{unreadInquiries} new</span>
                </span>
              )}
            </h2>
          </div>
          {inquiries.length > 10 && (
            <Link to="/exporter/inquiries" className="btn-ghost">
              View all →
            </Link>
          )}
        </div>

        {inqLoading && <SkeletonCard />}

        {!inqLoading && inquiries.length === 0 && (
          <div className="card text-center text-koko-muted">
            No inquiries yet. Share your{' '}
            <Link to={`/exporters/${user.uid}`} className="text-koko-teal hover:underline">
              public profile
            </Link>{' '}
            to start collecting leads.
          </div>
        )}

        {!inqLoading && inquiries.length > 0 && (
          <ul className="grid gap-3">
            {inquiries.slice(0, 10).map((q) => (
              <li
                key={q.id}
                className={`card animate-slide-up ${
                  q.status === 'new' ? 'border-koko-teal/40 bg-koko-teal100/30' : ''
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-semibold text-koko-ink">{q.name}</span>
                  {q.company && (
                    <span className="text-sm text-koko-muted">· {q.company}</span>
                  )}
                  <span className="ml-auto text-2xs text-koko-faint">
                    {q.status === 'new' && <span className="badge-error mr-2">New</span>}
                    {q.status === 'archived' && <span className="badge-navy mr-2">Archived</span>}
                  </span>
                </div>
                <p className="mt-2 text-sm text-koko-body whitespace-pre-line">
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
                  <span className="ml-auto flex gap-1">
                    {q.status === 'new' && (
                      <button
                        type="button"
                        onClick={() => markRead(q.id)}
                        className="btn-ghost !min-h-[32px] !px-2 !py-1 text-xs"
                      >
                        Mark read
                      </button>
                    )}
                    {q.status !== 'archived' && (
                      <button
                        type="button"
                        onClick={() => archive(q.id)}
                        className="btn-ghost !min-h-[32px] !px-2 !py-1 text-xs"
                      >
                        Archive
                      </button>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow">Recent</p>
            <h2 className="mt-1 font-display text-2xl text-koko-ink sm:text-3xl">Your shipments</h2>
          </div>
          <Link to="/exporter/shipments/new" className="btn-ghost">+ New</Link>
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && shipments.length === 0 && (
          <div className="card text-center animate-slide-up">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-koko-teal100 text-koko-teal">
              <span className="text-xl">📦</span>
            </div>
            <p className="eyebrow mt-4">No shipments yet</p>
            <p className="mt-2 text-koko-body">
              Scan farmer QR codes to build your first verified consignment.
            </p>
            <div className="mt-5">
              <Link to="/exporter/shipments/new" className="btn-accent">
                Scan first batch
              </Link>
            </div>
          </div>
        )}

        {!loading && shipments.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {shipments.map((s, i) => (
              <Link
                key={s.id}
                to={`/exporter/shipments/${s.id}`}
                className="card-hover animate-slide-up"
                style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xs text-koko-faint">{s.id.slice(0, 8)}…</span>
                  <span className="badge-navy">{s.status || 'shipped'}</span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-3xl text-koko-ink">{s.totalKg?.toFixed?.(1) ?? 0}</span>
                  <span className="text-sm text-koko-muted">kg</span>
                </div>
                <p className="mt-1 text-sm text-koko-body">
                  {s.batchIds?.length || 0} batches · {s.farmsCount || 0} farms
                </p>
                <div className="divider !my-4" />
                <div className="flex items-center justify-between text-xs text-koko-muted">
                  <span>{s.departureDate || 'No date'}</span>
                  <span className="font-medium text-koko-teal">
                    {s.destination || 'Destination TBC'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="card animate-slide-up">
      <p className="eyebrow">{label}</p>
      <div className="mt-2 font-display text-3xl text-koko-ink sm:text-4xl">
        {value === null ? <Skeleton className="h-9 w-32" /> : value}
      </div>
      {sub && <p className="mt-1 text-xs text-koko-muted">{sub}</p>}
    </div>
  );
}
