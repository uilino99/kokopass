import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublicOrganizations } from '../utils/firestore.js';
import { SkeletonCard } from '../components/Skeleton.jsx';
import Seo from '../components/Seo.jsx';

const TYPE_GROUPS = [
  { value: 'government', label: 'Government agencies', sub: 'Ministries, regulators, public extension services' },
  { value: 'ngo', label: 'NGOs', sub: 'Development partners and field programs' },
  { value: 'cooperative', label: 'Cooperatives', sub: 'Farmer-owned aggregators and member associations' },
  { value: 'certifier', label: 'Certifiers', sub: 'Audit bodies issuing cert programs' },
  { value: 'buyer', label: 'Buyers', sub: 'Brands sourcing single-origin from Samoa' },
  { value: 'private', label: 'Private organizations', sub: 'Other partners on the network' }
];

const TYPE_LABEL_SINGULAR = {
  government: 'Government',
  ngo: 'NGO',
  cooperative: 'Cooperative',
  certifier: 'Certifier',
  buyer: 'Buyer',
  private: 'Private'
};

export default function Organizations() {
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [activeRegion, setActiveRegion] = useState('all');

  useEffect(() => {
    let active = true;
    listPublicOrganizations()
      .then((list) => active && setRows(list))
      .catch(() => active && setRows([]));
    return () => {
      active = false;
    };
  }, []);

  const regions = useMemo(() => {
    if (!rows) return [];
    const set = new Set();
    rows.forEach((r) => (r.regions || []).forEach((reg) => reg && set.add(reg)));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeType !== 'all' && (r.type || 'private') !== activeType) return false;
      if (activeRegion !== 'all' && !(r.regions || []).includes(activeRegion)) return false;
      if (!q) return true;
      const hay = [r.name, r.contact?.headquarters, r.story, ...(r.regions || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, activeType, activeRegion]);

  const grouped = useMemo(() => {
    const map = new Map();
    TYPE_GROUPS.forEach((g) => map.set(g.value, []));
    filtered.forEach((r) => {
      const t = r.type || 'private';
      if (!map.has(t)) map.set(t, []);
      map.get(t).push(r);
    });
    return map;
  }, [filtered]);

  return (
    <div className="space-y-12 page">
      <Seo
        title="Partner organizations · KokoPass"
        description="Public directory of government agencies, NGOs, cooperatives and certifiers working on Samoa's cacao supply chain."
      />

      <header className="text-center animate-slide-up">
        <p className="eyebrow">Partner network</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-6xl">
          Organizations on KokoPass
        </h1>
        <div className="divider-teal mt-6" />
        <p className="mx-auto mt-6 max-w-2xl text-koko-body">
          Government agencies, NGOs, cooperatives and certifiers using the KokoPass platform
          to coordinate farmer registration, traceability and compliance across Samoa.
        </p>
      </header>

      <section className="card animate-slide-up">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            className="input flex-1"
            placeholder="Search organization, region, story…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input sm:!w-48"
            value={activeType}
            onChange={(e) => setActiveType(e.target.value)}
          >
            <option value="all">All types</option>
            {TYPE_GROUPS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
          <select
            className="input sm:!w-44"
            value={activeRegion}
            onChange={(e) => setActiveRegion(e.target.value)}
            disabled={regions.length === 0}
          >
            <option value="all">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        {rows && (
          <p className="helper mt-2">
            {filtered.length} of {rows.length} organization
            {rows.length === 1 ? '' : 's'} shown.
          </p>
        )}
      </section>

      {rows === null && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {rows && rows.length === 0 && (
        <div className="card text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-koko-teal100 text-koko-teal">
            <span className="text-xl">🏛</span>
          </div>
          <p className="eyebrow mt-4">No public organizations yet</p>
          <p className="mt-2 text-koko-body">
            Organizations on KokoPass can publish their profile here. Be the first.
          </p>
          <div className="mt-5">
            <Link to="/register" className="btn-accent">Register</Link>
          </div>
        </div>
      )}

      {rows && rows.length > 0 && filtered.length === 0 && (
        <div className="card text-center text-koko-muted">
          No organizations match those filters.
        </div>
      )}

      {filtered.length > 0 &&
        TYPE_GROUPS.map((g) => {
          const list = grouped.get(g.value) || [];
          if (list.length === 0) return null;
          return (
            <section key={g.value} className="animate-slide-up">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <div>
                  <p className="eyebrow">{TYPE_LABEL_SINGULAR[g.value]}</p>
                  <h2 className="mt-1 font-display text-2xl text-koko-ink sm:text-3xl">
                    {g.label}
                  </h2>
                  <p className="mt-1 text-sm text-koko-muted">{g.sub}</p>
                </div>
                <span className="text-xs text-koko-muted">
                  {list.length} listed
                </span>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((org, i) => (
                  <li
                    key={org.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}
                  >
                    <OrgCard org={org} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
    </div>
  );
}

function OrgCard({ org }) {
  const initial = (org.name || '?').slice(0, 1).toUpperCase();
  return (
    <Link to={`/org/${org.id}`} className="card-hover block h-full">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-koko-border bg-koko-bg">
          {org.logoUrl ? (
            <img
              src={org.logoUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="font-display text-xl text-koko-navy">{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl text-koko-ink leading-tight">
            {org.name}
          </h3>
          {org.contact?.headquarters && (
            <p className="mt-0.5 text-xs text-koko-muted">{org.contact.headquarters}</p>
          )}
        </div>
      </div>

      {org.story && (
        <p className="mt-3 line-clamp-3 text-sm text-koko-body">{org.story}</p>
      )}

      {org.regions?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {org.regions.slice(0, 4).map((r) => (
            <span key={r} className="badge-teal">{r}</span>
          ))}
          {org.regions.length > 4 && (
            <span className="badge-navy">+{org.regions.length - 4}</span>
          )}
        </div>
      )}

      <div className="divider !my-4" />
      <div className="flex items-center justify-between text-xs text-koko-muted">
        <span className="badge-navy capitalize">{TYPE_LABEL_SINGULAR[org.type] || 'Org'}</span>
        <span className="text-koko-teal">Open →</span>
      </div>
    </Link>
  );
}
