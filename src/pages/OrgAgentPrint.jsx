import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../hooks/useAuth.js';
import { useUserOrgs } from '../hooks/useUserOrgs.js';
import {
  getOrganization,
  subscribeEnrollmentsByOrg
} from '../utils/firestore.js';
import { FullPageSpinner } from '../components/Spinner.jsx';

const SCOPES = [
  { value: 'mine', label: 'My enrolments only' },
  { value: 'all', label: 'Entire org' }
];

export default function OrgAgentPrint() {
  const { orgId } = useParams();
  const { user } = useAuth();
  const { orgs } = useUserOrgs();
  const [org, setOrg] = useState(null);
  const [missing, setMissing] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [village, setVillage] = useState('all');
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
    const unsub = subscribeEnrollmentsByOrg(orgId, (list) => {
      setRows(list);
      setLoading(false);
    });
    return unsub;
  }, [orgId]);

  const myRole = orgs?.[orgId] || null;
  const isAdmin = myRole === 'admin' || user?.uid === org?.ownerUid;
  const isFieldAgent = myRole === 'fieldAgent';

  const unclaimed = useMemo(() => rows.filter((r) => !r.claimed), [rows]);

  const scoped = useMemo(() => {
    // Field agents can only print their own work even when "all" is
    // selected (we hide the scope picker for them below).
    if (!isAdmin || scope === 'mine') {
      return unclaimed.filter((r) => r.fieldAgentUid === user?.uid);
    }
    return unclaimed;
  }, [unclaimed, scope, isAdmin, user?.uid]);

  const villages = useMemo(
    () => Array.from(new Set(scoped.map((r) => r.village).filter(Boolean))).sort(),
    [scoped]
  );

  const filtered = useMemo(
    () => (village === 'all' ? scoped : scoped.filter((r) => r.village === village)),
    [scoped, village]
  );

  if (missing) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Not found</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">Organization not found</h1>
        <Link to="/orgs" className="btn-secondary mt-5 inline-flex">← Your orgs</Link>
      </div>
    );
  }

  if (!org || loading) return <FullPageSpinner label="Loading roster" />;

  if (!isAdmin && !isFieldAgent) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Not allowed</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">
          You need field-agent or admin access
        </h1>
        <Link to={`/org/${orgId}`} className="btn-secondary mt-5 inline-flex">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="page">
      <header className="no-print container-app pt-2 pb-6 animate-slide-up">
        <Link to={`/org/${orgId}/agent`} className="btn-ghost mb-3 inline-flex">
          ← Field workspace
        </Link>
        <p className="eyebrow">Field cards · {org.name}</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
          Print claim cards
        </h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Print one card per pre-enrolled farmer. Cards stay valid until claimed — keep a
          stack in your field bag.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm text-koko-body">
              <span>Scope</span>
              <select
                className="input !min-h-[40px] !py-2 !w-auto"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              >
                {SCOPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-koko-body">
            <span>Village</span>
            <select
              className="input !min-h-[40px] !py-2 !w-auto"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
            >
              <option value="all">All ({scoped.length})</option>
              {villages.map((v) => (
                <option key={v} value={v}>
                  {v} ({scoped.filter((r) => r.village === v).length})
                </option>
              ))}
            </select>
          </label>
          <span className="text-sm text-koko-muted">
            {filtered.length} card{filtered.length === 1 ? '' : 's'} · 8 per A4 page
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-accent"
              disabled={filtered.length === 0}
            >
              🖨 Print {filtered.length} card{filtered.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="no-print card text-center">
          <p className="text-koko-muted">No unclaimed enrolments to print.</p>
        </div>
      ) : (
        <main className="print-sheet">
          {filtered.map((r) => (
            <ClaimCard key={r.id} enrollment={r} origin={origin} orgName={org.name} />
          ))}
        </main>
      )}
    </div>
  );
}

function ClaimCard({ enrollment, origin, orgName }) {
  const url = `${origin}/claim/${enrollment.claimCode}`;
  return (
    <article className="print-card">
      <div className="print-card-body">
        <div className="print-card-head">
          <div className="print-card-brand">
            <img src="/icon.svg" alt="" className="print-card-logo" />
            <div>
              <div className="print-card-wordmark">
                Koko<span style={{ color: '#1D9E75' }}>Pass</span>
              </div>
              <div className="print-card-eyebrow">
                {orgName ? `${orgName.slice(0, 24)} · Pre-enrolled` : 'Samoa cacao · Pre-enrolled'}
              </div>
            </div>
          </div>
          <div className="print-card-qr">
            <QRCodeCanvas
              value={url}
              size={140}
              level="H"
              includeMargin={false}
              fgColor="#003366"
            />
          </div>
        </div>

        <div className="print-card-name">{enrollment.fullName || '—'}</div>
        <div className="print-card-meta">
          {enrollment.village || '—'}
          {enrollment.district ? ` · ${enrollment.district}` : ''}
        </div>

        <div className="print-card-foot">
          <div>
            <div className="print-card-label">Claim code</div>
            <div className="print-card-code">{enrollment.claimCode}</div>
          </div>
          <div className="print-card-instructions">
            Scan the QR or visit
            <br />
            <span className="print-card-url">
              {origin.replace(/^https?:\/\//, '')}/claim/{enrollment.claimCode}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
