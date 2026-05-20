import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import { getFarm } from '../utils/firestore.js';
import {
  seedBuyerScans,
  seedEnrollments,
  seedExporterProfile,
  seedExporterShipment,
  seedFarmerBatches
} from '../utils/seed.js';
import Spinner from '../components/Spinner.jsx';

export default function AdminSeed() {
  const { user, profile, loading } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [farm, setFarm] = useState(null);

  useEffect(() => {
    if (!user) return;
    getFarm(user.uid).then(setFarm);
  }, [user?.uid]);

  if (loading) return null;

  if (!user || profile?.admin !== true) {
    return (
      <div className="mx-auto max-w-xl page">
        <div className="card-elevated text-center animate-slide-up">
          <p className="eyebrow">Restricted</p>
          <h1 className="mt-2 font-display text-3xl text-koko-ink">Admin only</h1>
          <div className="divider-teal mt-4" />
          <p className="mt-4 text-sm text-koko-body">
            This page is reserved for KokoPass pilot operators. If you need access, set{' '}
            <code className="font-mono text-koko-teal">admin: true</code> on your user doc in
            the Firebase console.
          </p>
          <div className="mt-5">
            <Link to="/" className="btn-secondary">← Home</Link>
          </div>
        </div>
      </div>
    );
  }

  const run = async (key, label, fn) => {
    setBusy(key);
    try {
      const result = await fn();
      const count = typeof result === 'number' ? result : Array.isArray(result) ? result.length : 1;
      toast.success(`${label} · created ${count}`);
    } catch (err) {
      toast.error(err?.message || `${label} failed.`);
    } finally {
      setBusy(null);
    }
  };

  const role = profile.role;

  return (
    <div className="mx-auto max-w-3xl space-y-8 page">
      <header className="animate-slide-up">
        <p className="eyebrow">Pilot tools</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">Demo seeder</h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Populate your <span className="badge-navy capitalize">{role}</span> account with
          realistic Samoa-themed demo content. All records are written under your UID so they
          appear on your dashboard immediately and can be deleted via the Firebase console.
        </p>
      </header>

      <section className="space-y-4">
        {role === 'enroller' && (
          <Action
            title="Seed 10 sample enrollments"
            sub="Adds farmer records across 3+ villages with claim codes."
            busy={busy === 'enroll'}
            disabled={!!busy}
            onClick={() =>
              run('enroll', 'Enrollments seeded', () => seedEnrollments(user.uid, 10))
            }
          />
        )}

        {role === 'farmer' && (
          <>
            <Action
              title="Seed 5 sample batches"
              sub="Uses your existing farm profile if set; otherwise fabricates a Samoa-themed origin."
              busy={busy === 'farmer'}
              disabled={!!busy}
              onClick={() =>
                run('farmer', 'Batches seeded', () =>
                  seedFarmerBatches(user.uid, profile, farm, 5)
                )
              }
            />
            <p className="helper">
              Tip: set up your farm profile first so batches inherit your real village and
              story. <Link to="/farm" className="text-koko-teal hover:underline">Go to farm →</Link>
            </p>
          </>
        )}

        {role === 'exporter' && (
          <>
            <Action
              title="Seed public exporter profile"
              sub="Creates a 'Talofa Origin Co.' profile so /exporters/<your-uid> looks populated."
              busy={busy === 'eProfile'}
              disabled={!!busy}
              onClick={() =>
                run('eProfile', 'Profile seeded', () => seedExporterProfile(user.uid))
              }
            />
            <Action
              title="Seed 3 sample shipments"
              sub="Adds 3 shipments to your dashboard with destinations and tonnages."
              busy={busy === 'eShips'}
              disabled={!!busy}
              onClick={() =>
                run('eShips', 'Shipments seeded', async () => {
                  const ids = [];
                  for (let i = 0; i < 3; i += 1) {
                    ids.push(await seedExporterShipment(user.uid));
                  }
                  return ids;
                })
              }
            />
          </>
        )}

        {role === 'buyer' && (
          <Action
            title="Seed 8 sample scans"
            sub="Populates your portfolio with mixed batch + shipment scans across origins."
            busy={busy === 'buyer'}
            disabled={!!busy}
            onClick={() =>
              run('buyer', 'Scans seeded', () => seedBuyerScans(user.uid, 8))
            }
          />
        )}

        <div className="card animate-slide-up">
          <p className="eyebrow">Done seeding?</p>
          <p className="mt-2 text-sm text-koko-body">
            Head to your dashboard to see the populated content, then share the public surfaces:
          </p>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <li>
              <Link to="/dashboard" className="text-koko-teal hover:underline">→ Dashboard</Link>
            </li>
            {role === 'farmer' && (
              <li>
                <Link to={`/farmers/${user.uid}`} className="text-koko-teal hover:underline">
                  → Your public farmer page
                </Link>
              </li>
            )}
            {role === 'exporter' && (
              <>
                <li>
                  <Link to="/exporters" className="text-koko-teal hover:underline">
                    → Exporter directory
                  </Link>
                </li>
                <li>
                  <Link to={`/exporters/${user.uid}`} className="text-koko-teal hover:underline">
                    → Your public exporter page
                  </Link>
                </li>
              </>
            )}
            {role === 'enroller' && (
              <li>
                <Link to="/enroll/print" className="text-koko-teal hover:underline">
                  → Printable claim cards
                </Link>
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Action({ title, sub, busy, disabled, onClick }) {
  return (
    <div className="card-hover flex items-start justify-between gap-4 animate-slide-up">
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-xl text-koko-ink">{title}</h3>
        <p className="mt-1 text-sm text-koko-body">{sub}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="btn-accent shrink-0"
      >
        {busy && <Spinner size="sm" />} {busy ? 'Seeding…' : 'Run'}
      </button>
    </div>
  );
}
