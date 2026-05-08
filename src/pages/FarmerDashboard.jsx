import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getFarm, subscribeBatchesByOwner } from '../utils/firestore.js';
import { Skeleton, SkeletonCard } from '../components/Skeleton.jsx';

export default function FarmerDashboard() {
  const { user, profile } = useAuth();
  const [farm, setFarm] = useState(null);
  const [farmLoaded, setFarmLoaded] = useState(false);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const f = await getFarm(user.uid);
      if (active) {
        setFarm(f);
        setFarmLoaded(true);
      }
    })();
    const unsub = subscribeBatchesByOwner(user.uid, (rows) => {
      setBatches(rows);
      setLoading(false);
    });
    return () => {
      active = false;
      unsub();
    };
  }, [user.uid]);

  const totalKg = batches.reduce((acc, b) => acc + (Number(b.weightKg) || 0), 0);
  const firstName = profile?.fullName?.split(' ')[0] || 'friend';

  return (
    <div className="space-y-10">
      <header className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end animate-slide-up">
        <div>
          <p className="eyebrow">Your atelier</p>
          <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
            Talofa, <span className="italic text-koko-teal">{firstName}</span>
          </h1>
          <p className="mt-2 max-w-lg text-sm text-koko-body">
            Manage your farm profile and record verified cacao batches. Each batch becomes a
            scannable provenance pass.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/farm" className="btn-secondary">
            {farm ? 'Edit farm' : 'Set up farm'}
          </Link>
          <Link to="/batches/new" className="btn-accent">+ New batch</Link>
        </div>
      </header>

      <div className="grid gap-5 sm:grid-cols-3">
        <Stat
          label="Farm"
          value={farmLoaded ? farm?.farmName || 'Not set' : null}
          sub={farm?.village}
        />
        <Stat
          label="Batches"
          value={loading ? null : batches.length}
          sub="Provenance passes minted"
        />
        <Stat
          label="Total recorded"
          value={loading ? null : `${totalKg.toFixed(1)} kg`}
          sub="Verified cacao"
        />
      </div>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow">Recent</p>
            <h2 className="mt-1 font-display text-2xl text-koko-ink sm:text-3xl">Your batches</h2>
          </div>
          <Link to="/batches/new" className="btn-ghost">+ Record</Link>
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && batches.length === 0 && (
          <div className="card text-center animate-slide-up">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-koko-teal100 text-koko-teal">
              <span className="text-xl">🌱</span>
            </div>
            <p className="eyebrow mt-4">No batches yet</p>
            <p className="mt-2 text-koko-body">
              Begin your first traceability record — it takes under a minute.
            </p>
            <div className="mt-5">
              <Link to="/batches/new" className="btn-accent">Record first batch</Link>
            </div>
          </div>
        )}

        {!loading && batches.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {batches.map((b, i) => (
              <Link
                key={b.id}
                to={`/batches/${b.id}`}
                className="card-hover animate-slide-up"
                style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xs text-koko-faint">
                    {b.id.slice(0, 8)}…
                  </span>
                  <span className="badge-teal">Grade {b.quality}</span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-3xl text-koko-ink">{b.weightKg}</span>
                  <span className="text-sm text-koko-muted">kg</span>
                </div>
                <p className="mt-1 text-sm text-koko-body">{b.processing}</p>
                <div className="divider !my-4" />
                <div className="flex items-center justify-between text-xs text-koko-muted">
                  <span>Harvested {b.harvestDate}</span>
                  <span className="font-medium text-koko-teal">{b.farmName}</span>
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
