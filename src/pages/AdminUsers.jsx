import { useEffect, useMemo, useState } from 'react';
import { fetchRecentUsers } from '../utils/firestore.js';
import { Skeleton } from '../components/Skeleton.jsx';
import AdminNav from '../components/AdminNav.jsx';
import AdminGate from '../components/AdminGate.jsx';

const ROLE_TONE = {
  farmer: 'badge-teal',
  exporter: 'badge-navy',
  buyer: 'badge-success',
  enroller: 'badge-warning'
};

export default function AdminUsers() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');

  useEffect(() => {
    let active = true;
    fetchRecentUsers(200)
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
      if (role !== 'all' && (r.role || '') !== role) return false;
      if (!q) return true;
      const hay = [r.fullName, r.email, r.phone, r.uid].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, role]);

  return (
    <AdminGate>
      <div className="space-y-6 page">
        <AdminNav />

        <header className="animate-slide-up">
          <p className="eyebrow">People</p>
          <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">Users</h1>
          <div className="divider-teal mt-4 ml-0" />
          <p className="mt-4 text-sm text-koko-body">
            Recent accounts (newest first, capped at 200). Search is client-side over the
            currently loaded batch.
          </p>
        </header>

        <section className="card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              className="input flex-1"
              placeholder="Search name, email, phone, UID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="input sm:!w-44"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="all">All roles</option>
              <option value="farmer">Farmer</option>
              <option value="exporter">Exporter</option>
              <option value="buyer">Buyer</option>
              <option value="enroller">Enroller</option>
            </select>
          </div>
          {rows && (
            <p className="helper mt-2">
              Showing {filtered.length} of {rows.length} loaded user
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
            <div className="grid gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          )}
          {rows && filtered.length === 0 && (
            <div className="card text-koko-muted text-center">No users match.</div>
          )}
          {filtered.length > 0 && (
            <ul className="grid gap-2">
              {filtered.map((u) => (
                <li key={u.id} className="card">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-medium text-koko-ink">
                          {u.fullName || '—'}
                        </span>
                        {u.role && (
                          <span className={ROLE_TONE[u.role] || 'badge-navy'}>{u.role}</span>
                        )}
                        {u.admin === true && (
                          <span className="badge-error">admin</span>
                        )}
                      </div>
                      <p className="text-xs text-koko-muted">{u.email || 'no email'}</p>
                      <p className="mt-1 font-mono text-2xs text-koko-faint break-all">
                        {u.uid || u.id}
                      </p>
                    </div>
                    <div className="text-right text-2xs text-koko-faint">
                      {fmtTs(u.createdAt)}
                    </div>
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

function fmtTs(ts) {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  } catch {
    return '—';
  }
}
