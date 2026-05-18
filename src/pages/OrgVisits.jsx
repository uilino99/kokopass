import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useUserOrgs } from '../hooks/useUserOrgs.js';
import {
  getOrganization,
  subscribeAuditVisitsByOrg
} from '../utils/firestore.js';
import { fmtCsvDate } from '../utils/csv.js';
import { FullPageSpinner } from '../components/Spinner.jsx';
import ExportCsvButton from '../components/ExportCsvButton.jsx';

const REC_TONE = {
  pass: 'badge-success',
  fail: 'badge-error',
  'follow-up': 'badge-warning'
};

const REC_LABEL = {
  pass: 'Pass',
  fail: 'Fail',
  'follow-up': 'Follow-up'
};

const REC_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'follow-up', label: 'Follow-up' }
];

export default function OrgVisits() {
  const { orgId } = useParams();
  const { user } = useAuth();
  const { orgs } = useUserOrgs();
  const [org, setOrg] = useState(null);
  const [missing, setMissing] = useState(false);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recFilter, setRecFilter] = useState('all');
  const [scope, setScope] = useState('mine');

  useEffect(() => {
    let active = true;
    (async () => {
      const o = await getOrganization(orgId);
      if (!active) return;
      if (!o) setMissing(true);
      else setOrg(o);
    })();
    return () => {
      active = false;
    };
  }, [orgId]);

  useEffect(() => {
    const unsub = subscribeAuditVisitsByOrg(orgId, (rows) => {
      setVisits(rows);
      setLoading(false);
    });
    return unsub;
  }, [orgId]);

  const myRole = orgs?.[orgId] || null;
  const isAdmin = myRole === 'admin' || user?.uid === org?.ownerUid;
  const isAuditor = myRole === 'auditor';
  const canView = isAdmin || isAuditor;

  const filtered = useMemo(() => {
    let out = visits;
    if (!isAdmin || scope === 'mine') {
      out = out.filter((v) => v.auditorUid === user?.uid);
    }
    if (recFilter !== 'all') {
      out = out.filter((v) => v.recommendation === recFilter);
    }
    return out;
  }, [visits, recFilter, scope, isAdmin, user?.uid]);

  const counts = useMemo(() => {
    const base = visits.filter(
      (v) => isAdmin && scope === 'all' ? true : v.auditorUid === user?.uid
    );
    const c = { all: base.length, pass: 0, fail: 0, 'follow-up': 0 };
    base.forEach((v) => {
      const r = v.recommendation || 'pass';
      c[r] = (c[r] || 0) + 1;
    });
    return c;
  }, [visits, scope, isAdmin, user?.uid]);

  if (missing) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Not found</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">Organization not found</h1>
        <Link to="/orgs" className="btn-secondary mt-5 inline-flex">← Your orgs</Link>
      </div>
    );
  }

  if (!org || loading) return <FullPageSpinner label="Loading audit visits" />;

  if (!canView) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Auditor only</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">
          Audit visits are managed by org admins and auditors
        </h1>
        <Link to={`/org/${orgId}`} className="btn-secondary mt-5 inline-flex">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 page">
      <div className="no-print">
        <Link to={`/org/${orgId}`} className="btn-ghost">← {org.name}</Link>
      </div>

      <header className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end animate-slide-up">
        <div>
          <p className="eyebrow">Field audits</p>
          <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
            Audit visits
          </h1>
          <div className="divider-teal mt-4 ml-0" />
          <p className="mt-4 text-sm text-koko-body">
            Site visit records — the evidence trail behind every certification. Each visit
            is public-readable so buyers can see exactly why a farm is certified.
          </p>
        </div>
        <Link to={`/org/${orgId}/visits/new`} className="btn-accent">
          + Log a visit
        </Link>
      </header>

      <section className="card animate-slide-up">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {isAdmin && (
            <select
              className="input sm:!w-48"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="mine">My visits only</option>
              <option value="all">Entire org</option>
            </select>
          )}
          <select
            className="input sm:!w-44"
            value={recFilter}
            onChange={(e) => setRecFilter(e.target.value)}
          >
            {REC_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label} ({counts[s.value] ?? 0})
              </option>
            ))}
          </select>
          <span className="text-sm text-koko-muted sm:flex-1">
            {filtered.length} visit{filtered.length === 1 ? '' : 's'}
          </span>
          <ExportCsvButton
            rows={filtered}
            filename={`kokopass-audits-${org.name || 'org'}-${new Date().toISOString().slice(0, 10)}.csv`}
            label="Export"
            className="btn-secondary !min-h-[36px] !py-1.5"
            columns={[
              { header: 'visitId', field: 'id' },
              { header: 'visitDate', field: 'visitDate' },
              { header: 'farmUid', field: 'farmUid' },
              { header: 'farmName', field: 'farmNameHint' },
              { header: 'programName', field: 'programName' },
              { header: 'recommendation', field: 'recommendation' },
              { header: 'status', field: 'status' },
              { header: 'findings', field: 'findings' },
              { header: 'notes', field: 'notes' },
              { header: 'auditedBy', field: 'auditorName' },
              { header: 'lat', value: (v) => v.location?.lat ?? '' },
              { header: 'lng', value: (v) => v.location?.lng ?? '' },
              { header: 'createdAt', value: (v) => fmtCsvDate(v.createdAt) }
            ]}
          />
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="card text-center text-koko-muted">
          {visits.length === 0
            ? 'No visits recorded yet.'
            : 'None match these filters.'}
        </div>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((v) => (
            <li key={v.id}>
              <Link
                to={`/org/${orgId}/visits/${v.id}`}
                className="card-hover block"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className={REC_TONE[v.recommendation || 'pass']}>
                      {REC_LABEL[v.recommendation || 'pass']}
                    </span>
                    {v.status === 'draft' && (
                      <span className="badge-warning">Draft</span>
                    )}
                    <span className="font-medium text-koko-ink">
                      {v.farmNameHint || v.farmUid.slice(0, 12) + '…'}
                    </span>
                  </div>
                  <span className="text-2xs text-koko-faint">{v.visitDate}</span>
                </div>
                <p className="mt-2 text-sm text-koko-body">
                  {v.findings || v.notes || '—'}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-koko-muted">
                  <span>{v.auditorName || v.auditorUid.slice(0, 8) + '…'}</span>
                  {v.programName && (
                    <span className="text-koko-teal">{v.programName}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
