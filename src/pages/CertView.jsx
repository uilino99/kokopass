import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getAuditVisit,
  getCertification,
  getOrganization,
  getProgram
} from '../utils/firestore.js';
import { FullPageSpinner } from '../components/Spinner.jsx';
import Seo from '../components/Seo.jsx';

const STATUS_TONE = {
  verified: 'badge-success',
  pending: 'badge-warning',
  revoked: 'badge-error',
  expired: 'badge-error'
};

const STATUS_LABEL = {
  verified: 'Verified',
  pending: 'Pending audit',
  revoked: 'Revoked',
  expired: 'Expired'
};

function effectiveStatus(cert) {
  if (cert.status === 'revoked') return 'revoked';
  if (cert.expiresAt) {
    try {
      const d = cert.expiresAt.toDate ? cert.expiresAt.toDate() : new Date(cert.expiresAt);
      if (d.getTime() < Date.now()) return 'expired';
    } catch {
      /* ignore */
    }
  }
  return cert.status || 'verified';
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

export default function CertView() {
  const { certId } = useParams();
  const [cert, setCert] = useState(null);
  const [missing, setMissing] = useState(false);
  const [program, setProgram] = useState(null);
  const [org, setOrg] = useState(null);
  const [visit, setVisit] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const c = await getCertification(certId);
      if (!active) return;
      if (!c) {
        setMissing(true);
        return;
      }
      setCert(c);
      Promise.allSettled([
        c.orgId ? getOrganization(c.orgId) : Promise.resolve(null),
        c.orgId && c.programId
          ? getProgram(c.orgId, c.programId)
          : Promise.resolve(null),
        c.linkedVisitId ? getAuditVisit(c.linkedVisitId) : Promise.resolve(null)
      ]).then(([o, p, v]) => {
        if (!active) return;
        if (o.status === 'fulfilled') setOrg(o.value);
        if (p.status === 'fulfilled') setProgram(p.value);
        if (v.status === 'fulfilled') setVisit(v.value);
      });
    })();
    return () => {
      active = false;
    };
  }, [certId]);

  if (missing) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Not found</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">
          Certification not found
        </h1>
        <p className="mt-2 text-sm text-koko-body">
          The link may be wrong, or the certification was deleted.
        </p>
        <Link to="/" className="btn-secondary mt-5 inline-flex">← Home</Link>
      </div>
    );
  }

  if (!cert) return <FullPageSpinner label="Loading certification" />;

  const status = effectiveStatus(cert);

  return (
    <div className="mx-auto max-w-3xl space-y-8 page">
      <Seo
        title={`${cert.programName || 'Certification'} · ${cert.farmNameHint || 'Farm'}`}
        description={
          cert.notes ||
          `${cert.programName} certification issued by ${cert.orgName} · ${STATUS_LABEL[status]}`
        }
        kind="article"
      />

      <header className="card-elevated animate-slide-up">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-koko-border bg-koko-bg">
            {cert.logoUrl ? (
              <img src={cert.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-2xl text-koko-navy">
                {(cert.programName || '?').slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Certification</p>
            <h1 className="mt-1 font-display text-3xl text-koko-ink sm:text-4xl">
              {cert.programName || 'Program'}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className={STATUS_TONE[status]}>{STATUS_LABEL[status]}</span>
              {cert.linkedVisitDate && (
                <span className="badge-navy">Backed by audit · {cert.linkedVisitDate}</span>
              )}
            </div>
          </div>
        </div>

        <div className="divider" />

        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field
            label="Issuer"
            value={
              org ? (
                <Link to={`/org/${cert.orgId}`} className="text-koko-teal hover:underline">
                  {org.name}
                </Link>
              ) : (
                cert.orgName || '—'
              )
            }
          />
          <Field
            label="Farm"
            value={
              <Link
                to={`/farmers/${cert.farmUid}`}
                className="text-koko-teal hover:underline"
              >
                {cert.farmNameHint || cert.farmUid.slice(0, 10) + '…'}
              </Link>
            }
          />
          <Field label="Auditor" value={cert.auditedByName || '—'} />
          <Field label="Issued" value={fmtDate(cert.issuedAt)} />
          <Field label="Expires" value={fmtDate(cert.expiresAt)} />
          <Field
            label="Status"
            value={<span className={STATUS_TONE[status]}>{STATUS_LABEL[status]}</span>}
          />
        </dl>

        {cert.notes && (
          <>
            <div className="divider" />
            <p className="eyebrow">Audit notes</p>
            <p className="mt-2 text-sm text-koko-body whitespace-pre-line">{cert.notes}</p>
          </>
        )}

        {program?.description && (
          <>
            <div className="divider" />
            <p className="eyebrow">About this program</p>
            <p className="mt-2 text-sm text-koko-body whitespace-pre-line">
              {program.description}
            </p>
            <p className="mt-2 text-xs text-koko-muted">
              Validity: {program.validityMonths || 12} months ·{' '}
              {program.active ? 'Active' : 'Inactive'}
            </p>
          </>
        )}
      </header>

      {visit && (
        <section className="card-elevated animate-slide-up">
          <p className="eyebrow">Backing audit visit</p>
          <h2 className="mt-1 font-display text-2xl text-koko-ink">
            {visit.visitDate} ·{' '}
            <span
              className={
                visit.recommendation === 'pass'
                  ? 'text-koko-success'
                  : visit.recommendation === 'fail'
                    ? 'text-koko-error'
                    : 'text-koko-warning'
              }
            >
              {visit.recommendation === 'follow-up' ? 'Follow-up' : visit.recommendation || 'pass'}
            </span>
          </h2>
          {visit.findings && (
            <p className="mt-3 text-sm text-koko-body">{visit.findings}</p>
          )}
          <div className="mt-3">
            <Link
              to={`/visit/${visit.id}`}
              className="text-sm font-semibold text-koko-teal hover:underline"
            >
              See full visit record →
            </Link>
          </div>
        </section>
      )}

      <p className="text-center text-xs text-koko-muted">
        <span className="text-koko-faint">Certification ID</span>{' '}
        <span className="font-mono text-koko-ink break-all">{cert.id}</span>
      </p>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-widest text-koko-muted">{label}</dt>
      <dd className="mt-1 text-koko-ink">{value}</dd>
    </div>
  );
}
