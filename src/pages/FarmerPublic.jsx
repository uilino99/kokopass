import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  countBatchesByOwner,
  getFarm,
  listBatchesByOwner
} from '../utils/firestore.js';
import { FullPageSpinner } from '../components/Spinner.jsx';
import Seo from '../components/Seo.jsx';

export default function FarmerPublic() {
  const { uid } = useParams();
  const [farm, setFarm] = useState(null);
  const [batches, setBatches] = useState([]);
  const [totalBatches, setTotalBatches] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const f = await getFarm(uid);
        if (!active) return;
        if (!f) {
          setMissing(true);
          setLoading(false);
          return;
        }
        setFarm(f);
        const [recent, total] = await Promise.all([
          listBatchesByOwner(uid, 12),
          countBatchesByOwner(uid).catch(() => null)
        ]);
        if (!active) return;
        setBatches(recent);
        if (total != null) setTotalBatches(total);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [uid]);

  const stats = useMemo(() => {
    let kg = 0;
    const grades = {};
    batches.forEach((b) => {
      kg += Number(b.weightKg) || 0;
      if (b.quality) grades[b.quality] = (grades[b.quality] || 0) + 1;
    });
    return { kg, grades };
  }, [batches]);

  if (loading) return <FullPageSpinner label="Loading farmer" />;

  if (missing) {
    return (
      <div className="mx-auto max-w-xl page">
        <div className="card-elevated text-center animate-slide-up">
          <p className="eyebrow">Not listed</p>
          <h1 className="mt-2 font-display text-3xl text-koko-ink">Farmer not found</h1>
          <div className="divider-teal mt-4" />
          <p className="mt-4 text-sm text-koko-body">
            This farm record doesn't exist or hasn't been set up yet.
          </p>
        </div>
      </div>
    );
  }

  // Best-effort farmer name + avatar — these aren't on the farms doc, so we
  // fall back to the latest batch's snapshot (we know it's there because
  // BatchNew snapshots farmerName + farmerAvatarUrl on every batch).
  const recentForIdentity = batches[0] || {};
  const farmerName = recentForIdentity.farmerName || farm.farmName;
  const avatarUrl = recentForIdentity.farmerAvatarUrl || null;
  const initials = (farmerName || farm.farmName || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const seoTitle = `${farmerName} · ${farm.farmName}`;
  const seoDesc =
    farm.story ||
    [
      farm.village ? `${farm.village}, Samoa` : 'Samoa',
      farm.crop || 'Cacao',
      farm.variety,
      totalBatches != null ? `${totalBatches} batches verified` : null
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <div className="mx-auto max-w-4xl space-y-8 page">
      <Seo
        title={seoTitle}
        description={seoDesc}
        image={farm.heroUrl || avatarUrl || '/og-image.svg'}
        kind="profile"
      />
      <div className="no-print">
        <Link to="/" className="btn-ghost">← Home</Link>
      </div>

      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl border border-koko-border bg-white shadow-md animate-slide-up">
        {farm.heroUrl ? (
          <img
            src={farm.heroUrl}
            alt={`${farm.farmName} farm`}
            className="aspect-[16/9] w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="aspect-[16/9] w-full bg-navy-grad" />
        )}

        <div className="px-6 pb-7 sm:px-10 sm:pb-10">
          <div className="-mt-9 flex flex-wrap items-end gap-4 sm:-mt-12">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-koko-teal100 text-koko-teal shadow-md sm:h-24 sm:w-24">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={farmerName}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="font-display text-2xl">{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-2 sm:pt-6">
              <p className="eyebrow">Verified farmer</p>
              <h1 className="mt-1 font-display text-3xl text-koko-ink sm:text-5xl">
                {farmerName}
              </h1>
              <p className="text-sm text-koko-body">
                {farm.farmName}
                {farm.village ? ` · ${farm.village}` : ''}
                {farm.district ? `, ${farm.district}` : ''}
              </p>
              {(farm.crop || farm.variety) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {farm.crop && <span className="badge-teal">{farm.crop}</span>}
                  {farm.variety && <span className="badge-navy">{farm.variety}</span>}
                  {farm.sizeHectares > 0 && (
                    <span className="badge-navy">{farm.sizeHectares} ha</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {farm.story && (
            <blockquote className="mt-6 border-l-2 border-koko-teal pl-4 font-display text-lg italic text-koko-ink sm:text-xl">
              “{farm.story}”
            </blockquote>
          )}
        </div>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Batches recorded"
          value={totalBatches ?? batches.length}
          sub="Provenance passes minted"
        />
        <Stat
          label="Total recorded"
          value={`${stats.kg.toFixed(1)} kg`}
          sub={totalBatches > batches.length ? 'Across recent batches' : 'Verified cacao'}
        />
        <Stat
          label="Grades"
          value={
            Object.keys(stats.grades).length
              ? Object.entries(stats.grades)
                  .map(([g, n]) => `${g}×${n}`)
                  .join(' · ')
              : '—'
          }
          sub="Quality mix"
        />
      </div>

      {/* Recent batches */}
      <section>
        <div className="mb-5">
          <p className="eyebrow">Recent harvest</p>
          <h2 className="mt-1 font-display text-2xl text-koko-ink sm:text-3xl">Batches</h2>
        </div>

        {batches.length === 0 ? (
          <div className="card text-center text-koko-muted">
            This farmer hasn't recorded any batches yet.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {batches.map((b, i) => (
              <li
                key={b.id}
                className="animate-slide-up"
                style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
              >
                <Link to={`/verify/${b.id}`} className="card-hover block">
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
                  {b.photoUrls?.length > 0 && (
                    <div className="mt-3 flex gap-1.5">
                      {b.photoUrls.slice(0, 3).map((url) => (
                        <img
                          key={url}
                          src={url}
                          alt=""
                          className="h-12 w-12 rounded-md border border-koko-border object-cover"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  )}
                  <div className="divider !my-4" />
                  <div className="flex items-center justify-between text-xs text-koko-muted">
                    <span>Harvested {b.harvestDate}</span>
                    <span className="text-koko-teal">View pass →</span>
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
