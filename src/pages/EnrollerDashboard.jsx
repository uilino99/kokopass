import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { subscribeEnrollmentsByEnroller } from '../utils/firestore.js';
import { Skeleton, SkeletonCard } from '../components/Skeleton.jsx';

const PILOT_TARGET = 1000;

export default function EnrollerDashboard() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeEnrollmentsByEnroller(user.uid, (list) => {
      setRows(list);
      setLoading(false);
    });
    return unsub;
  }, [user.uid]);

  const total = rows.length;
  const claimed = rows.filter((r) => r.claimed).length;
  const villages = new Set(rows.map((r) => r.village).filter(Boolean)).size;
  const pct = Math.min(100, Math.round((total / PILOT_TARGET) * 100));
  const firstName = profile?.fullName?.split(' ')[0] || 'partner';

  return (
    <div className="space-y-10">
      <header className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end animate-slide-up">
        <div>
          <p className="eyebrow">Pilot enrolment</p>
          <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
            Talofa, <span className="italic text-koko-teal">{firstName}</span>
          </h1>
          <p className="mt-2 max-w-lg text-sm text-koko-body">
            Pre-enrol farmers across villages for the pilot. Each enrolment gets a 6-character
            claim code so the farmer can later sign up and inherit their record.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/enroll/print" className="btn-secondary">🖨 Print cards</Link>
          <Link to="/enroll/bulk" className="btn-secondary">↑ Bulk paste CSV</Link>
          <Link to="/enroll/new" className="btn-accent">+ New farmer</Link>
        </div>
      </header>

      <section className="card-elevated animate-slide-up">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Pilot progress</p>
            <h2 className="mt-1 font-display text-3xl text-koko-ink sm:text-4xl">
              {loading ? <Skeleton className="h-9 w-48 inline-block" /> : (
                <>
                  {total.toLocaleString()}
                  <span className="ml-1 text-base font-sans font-medium text-koko-muted">
                    / {PILOT_TARGET.toLocaleString()} farmers
                  </span>
                </>
              )}
            </h2>
          </div>
          <span className="badge-teal">{pct}%</span>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-koko-borderSoft">
          <div
            className="h-full bg-teal-grad transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-3">
        <Stat label="Pre-enrolled" value={loading ? null : total} sub="Total farmer records" />
        <Stat label="Claimed" value={loading ? null : `${claimed}`} sub={`of ${total} signed up`} />
        <Stat label="Villages" value={loading ? null : villages} sub="Reached so far" />
      </div>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow">Recent</p>
            <h2 className="mt-1 font-display text-2xl text-koko-ink sm:text-3xl">
              Your enrolments
            </h2>
          </div>
          <Link to="/enroll/new" className="btn-ghost">+ Add</Link>
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="card text-center animate-slide-up">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-koko-teal100 text-koko-teal">
              <span className="text-xl">🌱</span>
            </div>
            <p className="eyebrow mt-4">Nothing yet</p>
            <p className="mt-2 text-koko-body">
              Add farmers one by one or paste a CSV from your field roster.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link to="/enroll/new" className="btn-accent">Add a farmer</Link>
              <Link to="/enroll/bulk" className="btn-secondary">Paste CSV</Link>
            </div>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {rows.slice(0, 50).map((r, i) => (
              <li
                key={r.id}
                className="animate-slide-up"
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
              >
                <RosterTile record={r} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RosterTile({ record: r }) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className={r.claimed ? 'badge-success' : 'badge-teal'}>
          {r.claimed ? 'Claimed' : 'Pre-enrolled'}
        </span>
        <span className="font-mono text-2xs uppercase tracking-widest text-koko-faint">
          {r.claimCode}
        </span>
      </div>
      <h3 className="mt-3 font-display text-2xl text-koko-ink">{r.fullName}</h3>
      <p className="mt-1 text-sm text-koko-body">
        {[r.village, r.district].filter(Boolean).join(' · ') || '—'}
      </p>
      <div className="divider !my-4" />
      <div className="flex items-center justify-between text-xs text-koko-muted">
        <span>{r.phone || 'no phone'}</span>
        {r.claimed ? (
          <span className="text-koko-success">Claimed by farmer</span>
        ) : (
          <span className="text-koko-teal">Edit →</span>
        )}
      </div>
    </>
  );

  if (r.claimed) {
    return <div className="card opacity-80">{inner}</div>;
  }
  return (
    <Link
      to={`/enroll/${r.id}/edit`}
      className="card-hover block"
      aria-label={`Edit ${r.fullName}`}
    >
      {inner}
    </Link>
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
