import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getAuditVisit,
  getOrganization,
  listCertsByFarm
} from '../utils/firestore.js';
import FarmMap from '../components/FarmMap.jsx';
import { FullPageSpinner } from '../components/Spinner.jsx';
import Seo from '../components/Seo.jsx';

const REC_TONE = {
  pass: 'badge-success',
  fail: 'badge-error',
  'follow-up': 'badge-warning'
};

const REC_LABEL = {
  pass: 'Pass — compliant',
  fail: 'Fail — non-compliant',
  'follow-up': 'Follow-up required'
};

export default function VisitView() {
  const { visitId } = useParams();
  const [visit, setVisit] = useState(null);
  const [missing, setMissing] = useState(false);
  const [org, setOrg] = useState(null);
  const [linkedCert, setLinkedCert] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const v = await getAuditVisit(visitId);
      if (!active) return;
      if (!v) {
        setMissing(true);
        return;
      }
      setVisit(v);
      // Best-effort enrichment.
      Promise.allSettled([
        v.orgId ? getOrganization(v.orgId) : Promise.resolve(null),
        // Surface any cert that names this visit as its backing record.
        v.farmUid ? listCertsByFarm(v.farmUid).catch(() => []) : Promise.resolve([])
      ]).then(([o, certs]) => {
        if (!active) return;
        if (o.status === 'fulfilled') setOrg(o.value);
        if (certs.status === 'fulfilled') {
          const match = (certs.value || []).find((c) => c.linkedVisitId === v.id);
          if (match) setLinkedCert(match);
        }
      });
    })();
    return () => {
      active = false;
    };
  }, [visitId]);

  if (missing) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Not found</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">Audit visit not found</h1>
        <p className="mt-2 text-sm text-koko-body">
          The link may be wrong, or the visit was deleted.
        </p>
        <Link to="/" className="btn-secondary mt-5 inline-flex">← Home</Link>
      </div>
    );
  }

  if (!visit) return <FullPageSpinner label="Loading audit visit" />;

  const rec = visit.recommendation || 'pass';

  return (
    <div className="mx-auto max-w-3xl space-y-8 page">
      <Seo
        title={`Audit visit · ${visit.farmNameHint || 'Farm'} · ${visit.visitDate}`}
        description={
          visit.findings ||
          `${REC_LABEL[rec]} site visit by ${visit.auditorName || 'auditor'}${
            visit.orgName ? ` from ${visit.orgName}` : ''
          }`
        }
        kind="article"
      />

      <header className="card-elevated animate-slide-up">
        <p className="eyebrow">Audit visit</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink sm:text-4xl">
          {visit.farmNameHint || 'Site visit'}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className={REC_TONE[rec]}>{REC_LABEL[rec]}</span>
          <span className="badge-navy">{visit.visitDate}</span>
          {visit.status === 'draft' && <span className="badge-warning">Draft</span>}
          {visit.programName && (
            <span className="badge-navy">{visit.programName}</span>
          )}
        </div>

        <div className="divider" />

        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field
            label="Farm"
            value={
              <Link
                to={`/farmers/${visit.farmUid}`}
                className="text-koko-teal hover:underline"
              >
                {visit.farmNameHint || visit.farmUid.slice(0, 10) + '…'}
              </Link>
            }
          />
          <Field
            label="Issued by"
            value={
              org ? (
                <Link to={`/org/${visit.orgId}`} className="text-koko-teal hover:underline">
                  {org.name}
                </Link>
              ) : (
                visit.orgName || '—'
              )
            }
          />
          <Field label="Auditor" value={visit.auditorName || '—'} />
        </dl>
      </header>

      {(visit.findings || visit.notes) && (
        <section className="card-elevated animate-slide-up">
          {visit.findings && (
            <>
              <p className="eyebrow">Findings</p>
              <p className="mt-2 text-sm text-koko-body whitespace-pre-line">
                {visit.findings}
              </p>
            </>
          )}
          {visit.notes && (
            <>
              {visit.findings && <div className="divider" />}
              <p className="eyebrow">Notes</p>
              <p className="mt-2 text-sm text-koko-body whitespace-pre-line">
                {visit.notes}
              </p>
            </>
          )}
        </section>
      )}

      {visit.photoUrls?.length > 0 && (
        <section>
          <p className="eyebrow">Photos from the visit</p>
          <div
            className="mt-3 grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${Math.min(visit.photoUrls.length, 3)}, minmax(0, 1fr))`
            }}
          >
            {visit.photoUrls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                <img
                  src={url}
                  alt="Site visit"
                  className="aspect-square w-full rounded-2xl border border-koko-border object-cover shadow-sm transition hover:shadow-md"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {visit.location?.lat && visit.location?.lng && (
        <section className="card-elevated animate-slide-up">
          <p className="eyebrow">Where the visit happened</p>
          <p className="mt-1 text-xs text-koko-muted">
            GPS recorded by the auditor on site ·{' '}
            <span className="font-mono">
              {visit.location.lat.toFixed(5)}, {visit.location.lng.toFixed(5)}
            </span>
          </p>
          <div className="mt-4">
            <FarmMap
              pins={[
                {
                  id: visit.id,
                  lat: visit.location.lat,
                  lng: visit.location.lng,
                  farmName: visit.farmNameHint || 'Site visit',
                  village: visit.visitDate
                }
              ]}
              height={300}
            />
          </div>
        </section>
      )}

      {linkedCert && (
        <section className="card-elevated animate-slide-up">
          <p className="eyebrow">Resulting certification</p>
          <h2 className="mt-1 font-display text-2xl text-koko-ink">
            {linkedCert.programName}
          </h2>
          <p className="mt-1 text-sm text-koko-muted">
            Issued by {linkedCert.orgName || 'this organization'}.
          </p>
          <div className="mt-3">
            <Link
              to={`/cert/${linkedCert.id}`}
              className="text-sm font-semibold text-koko-teal hover:underline"
            >
              See certification →
            </Link>
          </div>
        </section>
      )}

      <p className="text-center text-xs text-koko-muted">
        <span className="text-koko-faint">Visit ID</span>{' '}
        <span className="font-mono text-koko-ink break-all">{visit.id}</span>
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
