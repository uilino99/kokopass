import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getExporterProfile,
  listExportsByOwner
} from '../utils/firestore.js';
import { FullPageSpinner } from '../components/Spinner.jsx';

export default function ExporterPublic() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await getExporterProfile(id);
        if (!active) return;
        if (!p || p.public !== true) {
          setError('not-found');
          setLoading(false);
          return;
        }
        setProfile(p);
        const ships = await listExportsByOwner(id, 12);
        if (!active) return;
        setShipments(ships);
      } catch (err) {
        if (active) setError(err?.message || 'Failed to load.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const stats = useMemo(() => {
    let totalKg = 0;
    let batches = 0;
    let farms = 0;
    const destinations = new Set();
    shipments.forEach((s) => {
      totalKg += Number(s.totalKg) || 0;
      batches += s.batchIds?.length || 0;
      farms += s.farmsCount || 0;
      if (s.destination) destinations.add(s.destination);
    });
    return { totalKg, batches, farms, destinations: destinations.size };
  }, [shipments]);

  if (loading) return <FullPageSpinner label="Loading exporter" />;

  if (error === 'not-found' || !profile) {
    return (
      <div className="mx-auto max-w-xl page">
        <div className="card-elevated text-center animate-slide-up">
          <p className="eyebrow">Not listed</p>
          <h1 className="mt-2 font-display text-3xl text-koko-ink">Exporter not found</h1>
          <div className="divider-teal mt-4" />
          <p className="mt-4 text-sm text-koko-body">
            This profile is private or doesn't exist.
          </p>
          <div className="mt-5">
            <Link to="/exporters" className="btn-secondary">← Back to directory</Link>
          </div>
        </div>
      </div>
    );
  }

  const initial = (profile.companyName || '?').slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto max-w-4xl space-y-8 page">
      <div className="no-print">
        <Link to="/exporters" className="btn-ghost">← Directory</Link>
      </div>

      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl border border-koko-border bg-white p-8 shadow-md animate-slide-up sm:p-10">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-hero-grad opacity-50"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-koko-border bg-koko-bg shadow-sm sm:h-24 sm:w-24">
            {profile.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt={profile.companyName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-display text-4xl text-koko-navy">{initial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Verified exporter</p>
            <h1 className="mt-1 font-display text-4xl text-koko-ink sm:text-5xl">
              {profile.companyName}
            </h1>
            {profile.headquarters && (
              <p className="mt-1 text-sm text-koko-muted">{profile.headquarters}</p>
            )}
            {profile.regions?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.regions.map((r) => (
                  <span key={r} className="badge-teal">{r}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {profile.story && (
          <blockquote className="mt-8 border-l-2 border-koko-teal pl-4 font-display text-lg italic text-koko-ink sm:text-xl">
            “{profile.story}”
          </blockquote>
        )}

        {(profile.email || profile.phone || profile.website) && (
          <div className="mt-6 flex flex-wrap gap-2">
            {profile.email && (
              <a href={`mailto:${profile.email}`} className="btn-secondary">
                ✉ {profile.email}
              </a>
            )}
            {profile.phone && (
              <a href={`tel:${profile.phone}`} className="btn-secondary">
                ☎ {profile.phone}
              </a>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noreferrer" className="btn-secondary">
                ↗ Website
              </a>
            )}
          </div>
        )}
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Shipments" value={shipments.length} sub="On KokoPass" />
        <Stat label="Total exported" value={`${stats.totalKg.toFixed(1)} kg`} sub="Verified cacao" />
        <Stat label="Batches aggregated" value={stats.batches} sub="Across shipments" />
        <Stat label="Destinations" value={stats.destinations} sub="Countries / buyers" />
      </div>

      {/* Recent shipments */}
      <section>
        <div className="mb-5">
          <p className="eyebrow">Recent</p>
          <h2 className="mt-1 font-display text-2xl text-koko-ink sm:text-3xl">Shipments</h2>
        </div>

        {shipments.length === 0 ? (
          <div className="card text-center text-koko-muted">
            This exporter hasn't created any shipments yet.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {shipments.map((s, i) => (
              <li
                key={s.id}
                className="animate-slide-up"
                style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
              >
                <Link to={`/verify/${s.id}`} className="card-hover block">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xs text-koko-faint">
                      {s.id.slice(0, 8)}…
                    </span>
                    <span className="badge-navy">{s.status || 'shipped'}</span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-3xl text-koko-ink">
                      {Number(s.totalKg ?? 0).toFixed(1)}
                    </span>
                    <span className="text-sm text-koko-muted">kg</span>
                  </div>
                  <p className="mt-1 text-sm text-koko-body">
                    {s.batchIds?.length || 0} batches · {s.farmsCount || 0} farms
                  </p>
                  <div className="divider !my-4" />
                  <div className="flex items-center justify-between text-xs text-koko-muted">
                    <span>{s.departureDate || 'No date'}</span>
                    <span className="text-koko-teal">{s.destination || 'Destination TBC'}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="card animate-slide-up">
      <p className="eyebrow">{label}</p>
      <div className="mt-2 font-display text-3xl text-koko-ink sm:text-4xl">{value}</div>
      {sub && <p className="mt-1 text-xs text-koko-muted">{sub}</p>}
    </div>
  );
}
