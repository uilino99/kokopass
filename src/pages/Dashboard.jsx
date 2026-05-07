import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getFarm, subscribeBatchesByOwner } from '../utils/firestore.js';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [farm, setFarm] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const f = await getFarm(user.uid);
      if (active) setFarm(f);
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

  return (
    <div className="space-y-10">
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Your atelier</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">
            Talofa, <span className="italic text-koko-gold">{profile?.fullName?.split(' ')[0] || 'friend'}</span>
          </h1>
          <p className="mt-2 max-w-lg text-sm text-koko-mist/85">
            Manage your farm profile and record verified cacao batches. Each batch becomes a
            scannable provenance pass.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/farm" className="btn-secondary">
            {farm ? 'Edit farm' : 'Set up farm'}
          </Link>
          <Link to="/batches/new" className="btn-primary">+ New batch</Link>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Stat label="Farm" value={farm?.farmName || 'Not set'} sub={farm?.village} />
        <Stat label="Batches" value={batches.length} sub="Provenance passes minted" />
        <Stat label="Total recorded" value={`${totalKg.toFixed(1)} kg`} sub="Verified cacao" />
      </div>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow">Recent</p>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl">Your batches</h2>
          </div>
          <Link to="/batches/new" className="btn-ghost">+ Record</Link>
        </div>

        {loading && <p className="text-koko-mist/70">Loading…</p>}

        {!loading && batches.length === 0 && (
          <div className="card-elevated text-center">
            <p className="eyebrow">No batches yet</p>
            <p className="mt-3 text-koko-mist/85">
              Begin your first traceability record — it takes under a minute.
            </p>
            <div className="mt-5">
              <Link to="/batches/new" className="btn-primary">Record first batch</Link>
            </div>
          </div>
        )}

        {batches.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {batches.map((b) => (
              <Link
                key={b.id}
                to={`/batches/${b.id}`}
                className="card-elevated transition hover:border-koko-gold/50 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-koko-mist/60">
                    {b.id.slice(0, 8)}…
                  </span>
                  <span className="badge">Grade {b.quality}</span>
                </div>
                <div className="mt-4 font-display text-3xl text-white">
                  {b.weightKg}
                  <span className="ml-1 text-base font-sans text-koko-mist/70">kg</span>
                </div>
                <p className="mt-1 text-sm text-koko-mist/85">{b.processing}</p>
                <div className="mt-4 rule-gold opacity-50" />
                <div className="mt-3 flex items-center justify-between text-xs text-koko-mist/70">
                  <span>Harvested {b.harvestDate}</span>
                  <span className="text-koko-gold">{b.farmName}</span>
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
    <div className="card-elevated">
      <p className="eyebrow">{label}</p>
      <div className="mt-2 font-display text-3xl text-white sm:text-4xl">{value}</div>
      {sub && <p className="mt-1 text-xs text-koko-mist/65">{sub}</p>}
    </div>
  );
}
