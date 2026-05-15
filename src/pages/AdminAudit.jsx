import { useEffect, useState } from 'react';
import { fetchAuditLogs } from '../utils/firestore.js';
import { Skeleton } from '../components/Skeleton.jsx';
import AdminNav from '../components/AdminNav.jsx';
import AdminGate from '../components/AdminGate.jsx';
import { AuditRow } from './AdminDashboard.jsx';

const FACETS = [
  { value: 'all', label: 'Recent (all)' },
  { value: 'collection', label: 'By collection' },
  { value: 'action', label: 'By action' },
  { value: 'actor', label: 'By actor UID' },
  { value: 'org', label: 'By org ID' }
];

const COLLECTIONS = [
  'farms',
  'batches',
  'exports',
  'enrollments',
  'inquiries',
  'organizations.members'
];

const ACTIONS = ['create', 'update', 'delete'];

export default function AdminAudit() {
  const [facet, setFacet] = useState('all');
  const [valColl, setValColl] = useState('farms');
  const [valAction, setValAction] = useState('delete');
  const [valActor, setValActor] = useState('');
  const [valOrg, setValOrg] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setRows(null);
    setError(null);
    try {
      const args = {};
      if (facet === 'collection') args.collection = valColl;
      else if (facet === 'action') args.action = valAction;
      else if (facet === 'actor') args.actorUid = valActor.trim() || null;
      else if (facet === 'org') args.orgId = valOrg.trim() || null;
      const data = await fetchAuditLogs({ ...args, max: 100 });
      setRows(data);
    } catch (e) {
      setError(e?.message || 'Query failed.');
      setRows([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminGate>
      <div className="space-y-6 page">
        <AdminNav />

        <header className="animate-slide-up">
          <p className="eyebrow">Audit</p>
          <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
            Audit log
          </h1>
          <div className="divider-teal mt-4 ml-0" />
          <p className="mt-4 text-sm text-koko-body">
            Every write to farms, batches, exports, enrollments, inquiries and member docs
            lands here. Pick one filter facet at a time — combined facets need new indexes.
          </p>
        </header>

        <section className="card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="text-sm text-koko-body sm:flex-1">
              <span className="label">Filter</span>
              <select
                className="input"
                value={facet}
                onChange={(e) => setFacet(e.target.value)}
              >
                {FACETS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </label>
            {facet === 'collection' && (
              <label className="text-sm text-koko-body sm:flex-1">
                <span className="label">Collection</span>
                <select
                  className="input"
                  value={valColl}
                  onChange={(e) => setValColl(e.target.value)}
                >
                  {COLLECTIONS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            )}
            {facet === 'action' && (
              <label className="text-sm text-koko-body sm:flex-1">
                <span className="label">Action</span>
                <select
                  className="input"
                  value={valAction}
                  onChange={(e) => setValAction(e.target.value)}
                >
                  {ACTIONS.map((a) => <option key={a}>{a}</option>)}
                </select>
              </label>
            )}
            {facet === 'actor' && (
              <label className="text-sm text-koko-body sm:flex-1">
                <span className="label">Actor UID</span>
                <input
                  className="input font-mono text-sm"
                  value={valActor}
                  onChange={(e) => setValActor(e.target.value)}
                  placeholder="paste a uid…"
                />
              </label>
            )}
            {facet === 'org' && (
              <label className="text-sm text-koko-body sm:flex-1">
                <span className="label">Organization ID</span>
                <input
                  className="input font-mono text-sm"
                  value={valOrg}
                  onChange={(e) => setValOrg(e.target.value)}
                  placeholder="paste an orgId…"
                />
              </label>
            )}
            <button type="button" onClick={load} className="btn-accent">
              Run query
            </button>
          </div>
          {error && (
            <p className="error-text mt-3" role="alert">
              <span aria-hidden>!</span> {error}
            </p>
          )}
        </section>

        <section>
          {rows === null && (
            <div className="grid gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}
          {rows && rows.length === 0 && (
            <div className="card text-koko-muted text-center">No rows match.</div>
          )}
          {rows && rows.length > 0 && (
            <>
              <p className="helper mb-2">
                Showing {rows.length} row{rows.length === 1 ? '' : 's'} · capped at 100.
              </p>
              <ul className="grid gap-2">
                {rows.map((r) => (
                  <AuditRow key={r.id} row={r} />
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </AdminGate>
  );
}
