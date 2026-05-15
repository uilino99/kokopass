import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllOrganizations } from '../utils/firestore.js';
import { Skeleton } from '../components/Skeleton.jsx';
import AdminNav from '../components/AdminNav.jsx';
import AdminGate from '../components/AdminGate.jsx';

const TYPES = ['government', 'ngo', 'cooperative', 'certifier', 'buyer', 'private'];

export default function AdminOrgs() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');

  useEffect(() => {
    let active = true;
    fetchAllOrganizations(200)
      .then((d) => active && setRows(d))
      .catch((e) => {
        if (active) {
          setError(e?.message || 'Query failed.');
          setRows([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (type !== 'all' && (r.type || '') !== type) return false;
      if (!q) return true;
      const hay = [r.name, r.contact?.headquarters, r.story, ...(r.regions || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, type]);

  return (
    <AdminGate>
      <div className="space-y-6 page">
        <AdminNav />

        <header className="animate-slide-up">
          <p className="eyebrow">Tenants</p>
          <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">Organizations</h1>
          <div className="divider-teal mt-4 ml-0" />
          <p className="mt-4 text-sm text-koko-body">
            Everything on <code className="font-mono">/organizations</code>, including
            private ones not surfaced on any public page.
          </p>
        </header>

        <section className="card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              className="input flex-1"
              placeholder="Search name, HQ, story, region…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="input sm:!w-44"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="all">All types</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {rows && (
            <p className="helper mt-2">
              Showing {filtered.length} of {rows.length} loaded org
              {rows.length === 1 ? '' : 's'}.
            </p>
          )}
          {error && (
            <p className="error-text mt-2" role="alert">
              <span aria-hidden>!</span> {error}
            </p>
          )}
        </section>

        <section>
          {rows === null && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}
          {rows && filtered.length === 0 && (
            <div className="card text-koko-muted text-center">No orgs match.</div>
          )}
          {filtered.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {filtered.map((o) => (
                <li key={o.id} className="card">
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-koko-border bg-koko-bg">
                      {o.logoUrl ? (
                        <img src={o.logoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-display text-lg text-koko-navy">
                          {(o.name || '?').slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-xl text-koko-ink">
                        {o.name || '(unnamed)'}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="badge-navy">{o.type || '—'}</span>
                        <span className={o.public ? 'badge-success' : 'badge-warning'}>
                          {o.public ? 'public' : 'private'}
                        </span>
                      </div>
                      {o.regions?.length > 0 && (
                        <p className="mt-2 text-xs text-koko-muted">
                          Regions: {o.regions.join(', ')}
                        </p>
                      )}
                      <p className="mt-2 font-mono text-2xs text-koko-faint break-all">
                        {o.id}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                    <Link
                      to={`/org/${o.id}`}
                      className="btn-ghost !min-h-[32px] !px-3 !py-1"
                    >
                      Dashboard
                    </Link>
                    {o.public && (
                      <Link
                        to={`/exporters`}
                        className="btn-ghost !min-h-[32px] !px-3 !py-1 hidden"
                      >
                        Public
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminGate>
  );
}
