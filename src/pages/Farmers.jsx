import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAllFarms } from '../utils/firestore.js';
import { SkeletonCard } from '../components/Skeleton.jsx';
import Seo from '../components/Seo.jsx';

const SORTS = [
  { value: 'name', label: 'Name (A→Z)' },
  { value: 'recent', label: 'Recently updated' },
  { value: 'largest', label: 'Largest first' }
];

export default function Farmers() {
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('all');
  const [crop, setCrop] = useState('all');
  const [sort, setSort] = useState('name');

  useEffect(() => {
    let active = true;
    listAllFarms(200)
      .then((list) => active && setRows(list))
      .catch(() => active && setRows([]));
    return () => {
      active = false;
    };
  }, []);

  const districts = useMemo(() => {
    if (!rows) return [];
    const set = new Set();
    rows.forEach((r) => {
      const d = (r.district || '').trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort();
  }, [rows]);

  const crops = useMemo(() => {
    if (!rows) return [];
    const set = new Set();
    rows.forEach((r) => {
      const c = (r.crop || '').trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (district !== 'all' && (r.district || '') !== district) return false;
      if (crop !== 'all' && (r.crop || '') !== crop) return false;
      if (!q) return true;
      const hay = [r.farmName, r.village, r.district, r.crop, r.variety, r.story]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
    if (sort === 'name') {
      out = [...out].sort((a, b) =>
        (a.farmName || '').localeCompare(b.farmName || '')
      );
    } else if (sort === 'recent') {
      out = [...out].sort(
        (a, b) => secondsOf(b.updatedAt) - secondsOf(a.updatedAt)
      );
    } else if (sort === 'largest') {
      out = [...out].sort(
        (a, b) => (Number(b.sizeHectares) || 0) - (Number(a.sizeHectares) || 0)
      );
    }
    return out;
  }, [rows, search, district, crop, sort]);

  return (
    <div className="space-y-12 page">
      <Seo
        title="Farmers · KokoPass"
        description="Browse single-origin cacao farms across Samoa. Each farmer's verified profile is one tap away."
      />

      <header className="text-center animate-slide-up">
        <p className="eyebrow">Origins</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-6xl">
          Samoan farmers,
          <br />
          <span className="italic text-koko-teal">verified.</span>
        </h1>
        <div className="divider-teal mt-6" />
        <p className="mx-auto mt-6 max-w-2xl text-koko-body">
          Every farmer on KokoPass has a public profile with a verifiable harvest history.
          Browse, filter by region or crop, and tap into the full story.
        </p>
      </header>

      <section className="card animate-slide-up">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            className="input flex-1"
            placeholder="Search farm name, village, story…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input sm:!w-44"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            disabled={districts.length === 0}
          >
            <option value="all">All districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            className="input sm:!w-36"
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            disabled={crops.length === 0}
          >
            <option value="all">All crops</option>
            {crops.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="input sm:!w-44"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        {rows && (
          <p className="helper mt-2">
            {filtered.length} of {rows.length} farm{rows.length === 1 ? '' : 's'} shown
            {rows.length >= 200 && ' (first 200 loaded)'}.
          </p>
        )}
      </section>

      {rows === null && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {rows && rows.length === 0 && (
        <div className="card text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-koko-teal100 text-koko-teal">
            <span className="text-xl">🌱</span>
          </div>
          <p className="eyebrow mt-4">No farm profiles yet</p>
          <p className="mt-2 text-koko-body">
            As farmers register and complete their profiles, they'll appear here.
          </p>
          <div className="mt-5">
            <Link to="/register" className="btn-accent">Register as a farmer</Link>
          </div>
        </div>
      )}

      {rows && rows.length > 0 && filtered.length === 0 && (
        <div className="card text-center text-koko-muted">
          No farmers match those filters.
        </div>
      )}

      {filtered.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((farm, i) => (
            <li
              key={farm.id}
              className="animate-slide-up"
              style={{ animationDelay: `${Math.min(i * 25, 240)}ms` }}
            >
              <FarmCard farm={farm} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FarmCard({ farm }) {
  const initial = (farm.farmName || '?').slice(0, 1).toUpperCase();
  return (
    <Link to={`/farmers/${farm.id}`} className="card-hover block h-full overflow-hidden p-0">
      {/* Hero strip */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-koko-bg">
        {farm.heroUrl ? (
          <img
            src={farm.heroUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-navy-grad" />
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-koko-border bg-koko-bg">
            <span className="font-display text-xl text-koko-navy">{initial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl text-koko-ink leading-tight">
              {farm.farmName || '(unnamed farm)'}
            </h3>
            {(farm.village || farm.district) && (
              <p className="mt-0.5 text-xs text-koko-muted">
                {[farm.village, farm.district].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>

        {farm.story && (
          <p className="mt-3 line-clamp-3 text-sm text-koko-body">{farm.story}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {farm.crop && <span className="badge-teal">{farm.crop}</span>}
          {farm.variety && <span className="badge-navy">{farm.variety}</span>}
          {farm.sizeHectares > 0 && (
            <span className="badge-navy">{farm.sizeHectares} ha</span>
          )}
        </div>

        <div className="divider !my-4" />
        <div className="flex items-center justify-between text-xs text-koko-muted">
          <span>{farm.district || 'Samoa'}</span>
          <span className="text-koko-teal">Open profile →</span>
        </div>
      </div>
    </Link>
  );
}

function secondsOf(ts) {
  if (!ts) return 0;
  if (typeof ts.seconds === 'number') return ts.seconds;
  if (ts.toDate) return Math.floor(ts.toDate().getTime() / 1000);
  return 0;
}
