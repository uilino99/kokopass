import { Link } from 'react-router-dom';

/**
 * Visual badge for a certification. Renders the program logo (or a
 * letter fallback), the program name, the issuing org, and a status
 * pill. Used on /farmers/:uid and /verify/:batchId.
 *
 * Wraps in a Link to /cert/:certId when an id is present, so each
 * badge becomes a shareable deep-link to the full cert record.
 */

const STATUS_TONE = {
  verified: 'border-koko-success/40 bg-koko-successBg text-koko-success',
  pending: 'border-koko-warning/40 bg-koko-warningBg text-koko-warning',
  revoked: 'border-koko-error/40 bg-koko-errorBg text-koko-error',
  expired: 'border-koko-error/40 bg-koko-errorBg text-koko-error'
};

const STATUS_LABEL = {
  verified: 'Verified',
  pending: 'Pending',
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

export default function CertBadge({ cert }) {
  const status = effectiveStatus(cert);
  const tone = STATUS_TONE[status] || STATUS_TONE.verified;
  const initial = (cert.programName || cert.orgName || '?').slice(0, 1).toUpperCase();

  const inner = (
    <>
      <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
        {cert.logoUrl ? (
          <img src={cert.logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-lg text-koko-navy">{initial}</span>
        )}
      </div>
      <div className="min-w-0 text-left">
        <div className="text-sm font-semibold text-koko-ink">
          {cert.programName || 'Program'}
        </div>
        <div className="text-2xs text-koko-muted">
          by {cert.orgName || 'Issuer'} · {STATUS_LABEL[status]}
        </div>
        {cert.linkedVisitDate && (
          <div className="text-2xs text-koko-muted">
            Backed by audit · {cert.linkedVisitDate}
          </div>
        )}
      </div>
    </>
  );

  if (cert.id) {
    return (
      <Link
        to={`/cert/${cert.id}`}
        className={`inline-flex items-center gap-3 rounded-xl border px-3 py-2 transition hover:shadow-sm ${tone}`}
      >
        {inner}
      </Link>
    );
  }
  return (
    <article className={`inline-flex items-center gap-3 rounded-xl border px-3 py-2 ${tone}`}>
      {inner}
    </article>
  );
}

export function CertBadgeRow({ certs }) {
  if (!certs || certs.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {certs.map((c) => (
        <CertBadge key={c.id} cert={c} />
      ))}
    </div>
  );
}
