import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [farm, setFarm] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const fSnap = await getDoc(doc(db, COLLECTIONS.farms, user.uid));
      if (active) setFarm(fSnap.exists() ? fSnap.data() : null);
    })();
    const q = query(
      collection(db, COLLECTIONS.batches),
      where('ownerUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setBatches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => {
      active = false;
      unsub();
    };
  }, [user.uid]);

  const totalKg = batches.reduce((acc, b) => acc + (Number(b.weightKg) || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold">Talofa, {profile?.fullName?.split(' ')[0] || 'farmer'} 👋</h1>
          <p className="text-sm text-koko-mist/80">
            Manage your farm and record verified cacao batches.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/farm" className="btn-secondary">
            {farm ? 'Edit farm' : 'Set up farm'}
          </Link>
          <Link to="/batches/new" className="btn-primary">+ New batch</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Farm" value={farm?.farmName || 'Not set'} />
        <Stat label="Batches" value={batches.length} />
        <Stat label="Total recorded" value={`${totalKg.toFixed(1)} kg`} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Your batches</h2>
        {loading && <p className="text-koko-mist/70">Loading…</p>}
        {!loading && batches.length === 0 && (
          <div className="card text-center text-koko-mist/80">
            No batches yet. <Link to="/batches/new" className="text-koko-accent hover:underline">Record your first batch</Link>.
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {batches.map((b) => (
            <Link
              key={b.id}
              to={`/batches/${b.id}`}
              className="card hover:border-koko-accent/60 transition"
            >
              <div className="flex items-center justify-between text-xs text-koko-mist/60">
                <span className="font-mono">{b.id.slice(0, 8)}…</span>
                <span className="badge">Grade {b.quality}</span>
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {b.weightKg} kg · {b.processing}
              </div>
              <div className="mt-1 text-sm text-koko-mist/80">
                Harvested {b.harvestDate} · {b.farmName}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-koko-mist/60">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
