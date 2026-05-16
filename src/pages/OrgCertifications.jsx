import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useUserOrgs } from '../hooks/useUserOrgs.js';
import { useToast } from '../components/Toast.jsx';
import {
  createCertification,
  deleteCertification,
  getFarm,
  getOrganization,
  listOrgPrograms,
  subscribeCertsByOrg,
  updateCertification
} from '../utils/firestore.js';
import CertBadge from '../components/CertBadge.jsx';
import Spinner, { FullPageSpinner } from '../components/Spinner.jsx';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'verified', label: 'Verified' },
  { value: 'pending', label: 'Pending' },
  { value: 'revoked', label: 'Revoked' }
];

export default function OrgCertifications() {
  const { orgId } = useParams();
  const { user, profile } = useAuth();
  const { orgs } = useUserOrgs();
  const toast = useToast();

  const [org, setOrg] = useState(null);
  const [missing, setMissing] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    farmUid: '',
    programId: '',
    notes: '',
    status: 'verified'
  });
  const [lookingUp, setLookingUp] = useState(false);
  const [farmHint, setFarmHint] = useState(null);
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let active = true;
    (async () => {
      const o = await getOrganization(orgId);
      if (!active) return;
      if (!o) {
        setMissing(true);
        return;
      }
      setOrg(o);
      try {
        const p = await listOrgPrograms(orgId);
        if (!active) return;
        setPrograms(p);
        const firstActive = p.find((x) => x.active);
        if (firstActive) setForm((f) => ({ ...f, programId: firstActive.id }));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [orgId]);

  useEffect(() => {
    const unsub = subscribeCertsByOrg(orgId, (rows) => {
      setCerts(rows);
      setLoading(false);
    });
    return unsub;
  }, [orgId]);

  const myRole = orgs?.[orgId] || null;
  const isAdmin = myRole === 'admin' || user?.uid === org?.ownerUid;
  const isAuditor = myRole === 'auditor';
  const canIssue = isAdmin || isAuditor;

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return certs;
    return certs.filter((c) => (c.status || 'verified') === statusFilter);
  }, [certs, statusFilter]);

  const counts = useMemo(() => {
    const c = { all: certs.length, verified: 0, pending: 0, revoked: 0 };
    certs.forEach((cert) => {
      const s = cert.status || 'verified';
      c[s] = (c[s] || 0) + 1;
    });
    return c;
  }, [certs]);

  const lookupFarm = async () => {
    const uid = form.farmUid.trim();
    if (!uid) {
      setFarmHint(null);
      return;
    }
    setLookingUp(true);
    try {
      const f = await getFarm(uid);
      setFarmHint(f ? { found: true, name: f.farmName, village: f.village } : { found: false });
    } catch {
      setFarmHint({ found: false });
    } finally {
      setLookingUp(false);
    }
  };

  const issue = async (e) => {
    e.preventDefault();
    if (!form.farmUid.trim()) return toast.error('Enter a farm UID.');
    if (!form.programId) return toast.error('Pick a program.');
    const program = programs.find((p) => p.id === form.programId);
    if (!program) return toast.error('That program no longer exists.');
    setBusy(true);
    try {
      const expiresAt = (() => {
        const months = Number(program.validityMonths) || 12;
        const d = new Date();
        d.setMonth(d.getMonth() + months);
        return d;
      })();
      await createCertification({
        orgId,
        orgName: org.name,
        programId: program.id,
        programName: program.name,
        logoUrl: program.logoUrl || org.logoUrl || null,
        farmUid: form.farmUid.trim(),
        farmNameHint: farmHint?.found ? farmHint.name : '',
        status: form.status,
        notes: form.notes.trim(),
        auditedBy: user.uid,
        auditedByName: profile?.fullName || '',
        expiresAt
      });
      toast.success(`Certification issued: ${program.name}`);
      setForm({ farmUid: '', programId: program.id, notes: '', status: 'verified' });
      setFarmHint(null);
    } catch (err) {
      toast.error(err.message || 'Could not issue.');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (cert, status) => {
    try {
      await updateCertification(cert.id, { orgId: cert.orgId, status });
      toast.success(status === 'revoked' ? 'Certification revoked.' : 'Status updated.');
    } catch (err) {
      toast.error(err.message || 'Could not update.');
    }
  };

  const remove = async (cert) => {
    if (!isAdmin) {
      toast.error('Only org admins can hard-delete. Revoke instead.');
      return;
    }
    if (!window.confirm(`Permanently delete this certification for ${cert.farmNameHint || cert.farmUid}?`)) return;
    try {
      await deleteCertification(cert.id);
      toast.success('Deleted.');
    } catch (err) {
      toast.error(err.message || 'Could not delete.');
    }
  };

  if (missing) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Not found</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">Organization not found</h1>
        <Link to="/orgs" className="btn-secondary mt-5 inline-flex">← Your orgs</Link>
      </div>
    );
  }

  if (!org || loading) return <FullPageSpinner label="Loading certifications" />;

  if (!canIssue) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Auditor only</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">
          Certifications are managed by org admins and auditors
        </h1>
        <p className="mt-2 text-sm text-koko-body">
          Ask an admin of <strong>{org.name}</strong> to invite you with the{' '}
          <span className="badge-navy">auditor</span> role.
        </p>
        <Link to={`/org/${orgId}`} className="btn-secondary mt-5 inline-flex">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const activePrograms = programs.filter((p) => p.active);

  return (
    <div className="mx-auto max-w-3xl space-y-8 page">
      <div className="no-print">
        <Link to={`/org/${orgId}`} className="btn-ghost">← {org.name}</Link>
      </div>

      <header className="animate-slide-up">
        <p className="eyebrow">Certifications</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
          Issued certifications
        </h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Each certification ties a farm to one of your programs. Public verify pages and
          the farmer's profile show a badge while the cert is active.
        </p>
      </header>

      {activePrograms.length === 0 ? (
        <div className="card border-koko-warning/40 bg-koko-warningBg/50">
          <p className="text-sm text-koko-body">
            No active programs to issue.{' '}
            {isAdmin ? (
              <Link to={`/org/${orgId}/programs`} className="text-koko-teal hover:underline">
                Set one up first →
              </Link>
            ) : (
              <span>Ask an admin to add a program.</span>
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={issue} className="card-elevated space-y-4 animate-slide-up">
          <p className="eyebrow">Issue a certification</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="c-farm">Farm UID</label>
              <div className="flex gap-2">
                <input
                  id="c-farm"
                  className="input flex-1 font-mono text-sm"
                  value={form.farmUid}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, farmUid: e.target.value }));
                    setFarmHint(null);
                  }}
                  placeholder="paste a farm UID…"
                />
                <button
                  type="button"
                  onClick={lookupFarm}
                  disabled={lookingUp || !form.farmUid.trim()}
                  className="btn-secondary"
                >
                  {lookingUp ? <Spinner size="sm" /> : 'Look up'}
                </button>
              </div>
              {farmHint && (
                <p
                  className={`mt-1 text-xs ${
                    farmHint.found ? 'text-koko-success' : 'text-koko-error'
                  }`}
                >
                  {farmHint.found
                    ? `✓ ${farmHint.name}${farmHint.village ? ` · ${farmHint.village}` : ''}`
                    : '✗ No farm found at that UID. You can still issue — the farmer can claim later.'}
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="c-program">Program</label>
              <select
                id="c-program"
                className="input"
                value={form.programId}
                onChange={(e) => setForm((f) => ({ ...f, programId: e.target.value }))}
              >
                {activePrograms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.validityMonths || 12}mo
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="c-status">Status</label>
              <select
                id="c-status"
                className="input"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="verified">Verified</option>
                <option value="pending">Pending audit</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="c-notes">Audit notes</label>
            <textarea
              id="c-notes"
              className="input"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Site visit findings, conditions, expiry caveats…"
            />
          </div>
          <div className="flex justify-end">
            <button className="btn-accent" disabled={busy}>
              {busy && <Spinner size="sm" />} {busy ? 'Issuing…' : 'Issue certification'}
            </button>
          </div>
        </form>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl text-koko-ink sm:text-3xl">
            {certs.length} issued
          </h2>
          <select
            className="input !min-h-[36px] !py-1.5 !w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label} ({counts[s.value] ?? 0})
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="card text-koko-muted text-center">
            {certs.length === 0
              ? 'No certifications issued yet.'
              : 'None match this status filter.'}
          </div>
        ) : (
          <ul className="grid gap-3">
            {filtered.map((c) => (
              <li key={c.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CertBadge cert={c} />
                    <div className="mt-3 grid gap-1 text-xs text-koko-muted">
                      <div>
                        <span className="text-koko-faint">Farm:</span>{' '}
                        <Link
                          to={`/farmers/${c.farmUid}`}
                          className="text-koko-teal hover:underline"
                        >
                          {c.farmNameHint || c.farmUid.slice(0, 12) + '…'}
                        </Link>
                      </div>
                      {c.notes && (
                        <div>
                          <span className="text-koko-faint">Notes:</span>{' '}
                          <span className="text-koko-body">{c.notes}</span>
                        </div>
                      )}
                      {c.expiresAt && (
                        <div>
                          <span className="text-koko-faint">Expires:</span>{' '}
                          {fmtDate(c.expiresAt)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs">
                    {c.status !== 'revoked' && (
                      <button
                        type="button"
                        onClick={() => setStatus(c, 'revoked')}
                        className="btn-ghost !min-h-[32px] !px-3 !py-1 hover:!text-koko-error"
                      >
                        Revoke
                      </button>
                    )}
                    {c.status === 'revoked' && (
                      <button
                        type="button"
                        onClick={() => setStatus(c, 'verified')}
                        className="btn-ghost !min-h-[32px] !px-3 !py-1 hover:!text-koko-success"
                      >
                        Restore
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => remove(c)}
                        className="btn-ghost !min-h-[32px] !px-3 !py-1 text-koko-error"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function fmtDate(ts) {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  } catch {
    return '—';
  }
}
