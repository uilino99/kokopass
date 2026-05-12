import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getBatch,
  getExport,
  recordScan,
  subscribeBatch
} from '../utils/firestore.js';
import { useAuth } from '../hooks/useAuth.js';
import { FullPageSpinner } from '../components/Spinner.jsx';

export default function Verify() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [kind, setKind] = useState(null); // 'batch' | 'shipment' | 'missing'
  const [data, setData] = useState(null);
  const [shipmentBatches, setShipmentBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const recordedRef = useRef(null);

  useEffect(() => {
    let active = true;
    let unsubBatch = null;

    (async () => {
      const batch = await getBatch(id);
      if (!active) return;
      if (batch) {
        unsubBatch = subscribeBatch(id, (b) => {
          if (!active) return;
          setData(b);
          setKind(b ? 'batch' : 'missing');
        });
        setKind('batch');
        setData(batch);
        setLoading(false);
        return;
      }
      const ship = await getExport(id);
      if (!active) return;
      if (ship) {
        setKind('shipment');
        setData(ship);
        const rows = await Promise.all((ship.batchIds || []).map((bid) => getBatch(bid)));
        if (!active) return;
        setShipmentBatches(rows.filter(Boolean));
        setLoading(false);
        return;
      }
      setKind('missing');
      setLoading(false);
    })();

    return () => {
      active = false;
      if (unsubBatch) unsubBatch();
    };
  }, [id]);

  // Auto-record scan when a signed-in buyer lands on the page.
  useEffect(() => {
    if (!user || profile?.role !== 'buyer') return;
    if (!data || !kind || kind === 'missing') return;
    if (recordedRef.current === data.id) return;
    recordedRef.current = data.id;

    const summary =
      kind === 'shipment'
        ? {
            destination: data.destination || '',
            buyerName: data.buyerName || '',
            totalKg: data.totalKg ?? null,
            batchesCount: data.batchIds?.length ?? 0,
            farmsCount: data.farmsCount ?? null
          }
        : {
            farmName: data.farmName || '',
            village: data.village || '',
            weightKg: data.weightKg ?? null,
            quality: data.quality || '',
            harvestDate: data.harvestDate || ''
          };

    recordScan(user.uid, { refId: data.id, refKind: kind, summary })
      .then(() => setSaved(true))
      .catch(() => {});
  }, [user, profile, data, kind]);

  if (loading) return <FullPageSpinner label="Verifying" />;

  if (kind === 'missing') {
    return (
      <div className="mx-auto max-w-xl page">
        <div className="card-elevated text-center animate-slide-up">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-koko-errorBg text-koko-error">
            <span className="text-2xl">×</span>
          </div>
          <p className="eyebrow mt-3 !text-koko-error">Not recognised</p>
          <h1 className="mt-2 font-display text-3xl text-koko-ink">This QR isn't a KokoPass</h1>
          <div className="divider-teal mt-4" />
          <p className="mt-4 text-sm text-koko-body">
            We couldn't verify this code. Please contact the seller.
          </p>
        </div>
      </div>
    );
  }

  if (kind === 'shipment')
    return <ShipmentView shipment={data} batches={shipmentBatches} saved={saved} />;
  return <BatchView batch={data} saved={saved} />;
}

function SavedPill({ saved }) {
  if (!saved) return null;
  return (
    <div className="mb-4 flex animate-slide-up items-center justify-center gap-2 rounded-full border border-koko-success/40 bg-koko-successBg px-3 py-2 text-xs font-semibold text-koko-success">
      <span className="grid h-4 w-4 place-items-center rounded-full bg-koko-success text-[10px] text-white">
        ✓
      </span>
      Saved to your portfolio
    </div>
  );
}

/* ---------- Batch verify ---------- */

function BatchView({ batch, saved }) {
  const initials = (batch.farmerName || batch.farmName || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-8 page">
      <SavedPill saved={saved} />
      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl border border-koko-border bg-white shadow-md animate-slide-up">
        <div className="relative">
          {batch.farmHeroUrl ? (
            <img
              src={batch.farmHeroUrl}
              alt={`${batch.farmName} farm`}
              className="aspect-[16/9] w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="aspect-[16/9] w-full bg-navy-grad" />
          )}
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-koko-teal shadow-sm backdrop-blur">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-koko-teal text-[10px] text-white">✓</span>
            Verified
          </span>
        </div>

        <div className="px-6 pb-7 sm:px-10 sm:pb-10">
          {/* Farmer chip floats over hero edge */}
          <div className="-mt-9 flex flex-wrap items-end gap-4 sm:-mt-12">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-koko-teal100 text-koko-teal shadow-md sm:h-24 sm:w-24">
              {batch.farmerAvatarUrl ? (
                <img
                  src={batch.farmerAvatarUrl}
                  alt={batch.farmerName || 'Farmer'}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="font-display text-2xl">{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-2 sm:pt-6">
              <p className="eyebrow">Grown by</p>
              <h1 className="mt-1 font-display text-3xl text-koko-ink sm:text-4xl">
                {batch.farmerName || batch.farmName}
              </h1>
              <p className="text-sm text-koko-body">
                {batch.farmName} · {batch.village || 'Samoa'}
                {batch.district ? `, ${batch.district}` : ''}
              </p>
            </div>
          </div>

          {batch.farmStory && (
            <blockquote className="mt-6 border-l-2 border-koko-teal pl-4 font-display text-lg italic text-koko-ink sm:text-xl">
              “{batch.farmStory}”
            </blockquote>
          )}

          {batch.farmId && (
            <div className="mt-6">
              <Link
                to={`/farmers/${batch.farmId}`}
                className="text-sm font-semibold text-koko-teal hover:underline"
              >
                More from this farmer →
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Specs */}
      <article className="card-elevated animate-slide-up">
        <p className="eyebrow">This batch</p>
        <h2 className="mt-1 font-display text-2xl text-koko-ink">
          {batch.weightKg} kg · {batch.processing}
        </h2>
        <div className="divider" />
        <dl className="grid grid-cols-2 gap-y-5 sm:grid-cols-3">
          <Field label="Variety" value={`${batch.crop}${batch.variety ? ` · ${batch.variety}` : ''}`} />
          <Field label="Harvest" value={batch.harvestDate} />
          <Field label="Weight" value={`${batch.weightKg} kg`} />
          <Field label="Grade" value={<span className="badge-teal">{batch.quality}</span>} />
          <Field label="Processing" value={batch.processing} />
          {batch.moisturePct != null && <Field label="Moisture" value={`${batch.moisturePct}%`} />}
          {batch.location && (
            <Field
              label="Coordinates"
              value={`${batch.location.lat.toFixed(4)}, ${batch.location.lng.toFixed(4)}`}
            />
          )}
        </dl>
      </article>

      {/* Photos */}
      {batch.photoUrls?.length > 0 && (
        <section className="animate-slide-up">
          <p className="eyebrow">From the harvest</p>
          <div
            className="mt-3 grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${Math.min(batch.photoUrls.length, 3)}, minmax(0, 1fr))`
            }}
          >
            {batch.photoUrls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                <img
                  src={url}
                  alt="Batch"
                  className="aspect-square w-full rounded-2xl border border-koko-border object-cover shadow-sm transition hover:shadow-md"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      <p className="text-center text-xs text-koko-muted">
        <span className="text-koko-faint">Batch ID</span>{' '}
        <span className="font-mono text-koko-ink break-all">{batch.id}</span>
      </p>
    </div>
  );
}

/* ---------- Shipment verify ---------- */

function ShipmentView({ shipment, batches, saved }) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 page">
      <SavedPill saved={saved} />
      <div className="card-elevated text-center animate-slide-up">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-koko-teal100 text-koko-teal animate-bounce-sm">
          <span className="text-2xl">✓</span>
        </div>
        <p className="eyebrow mt-3">Verified consignment</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
          Authentic <span className="italic text-koko-teal">KokoPass</span>
        </h1>
        <div className="divider-teal mt-5" />
        <p className="mt-5 text-sm text-koko-body sm:text-base">
          This shipment is traceable to {shipment.farmsCount || batches.length || 0} verified
          farm{(shipment.farmsCount || batches.length || 0) === 1 ? '' : 's'} in Samoa.
        </p>
      </div>

      <article className="card-elevated animate-slide-up">
        <p className="eyebrow">Shipment</p>
        <h2 className="mt-2 font-display text-3xl text-koko-ink">
          {shipment.totalKg?.toFixed?.(1) ?? 0} kg
          <span className="block text-base font-sans font-medium text-koko-muted">
            to {shipment.destination || '—'}
            {shipment.buyerName ? ` · ${shipment.buyerName}` : ''}
          </span>
        </h2>
        <div className="divider" />
        <dl className="grid grid-cols-2 gap-y-5 sm:grid-cols-3">
          <Field label="Departure" value={shipment.departureDate || '—'} />
          <Field label="Vessel" value={shipment.vessel || '—'} />
          <Field label="Batches" value={shipment.batchIds?.length || batches.length} />
          <Field label="Farms" value={shipment.farmsCount || '—'} />
        </dl>
      </article>

      <article className="card-elevated animate-slide-up">
        <p className="eyebrow">Manifest</p>
        <h2 className="mt-1 font-display text-2xl text-koko-ink">Batches in this shipment</h2>
        {batches.length === 0 ? (
          <p className="mt-4 text-sm text-koko-muted">No batches resolved.</p>
        ) : (
          <ul className="mt-4 divide-y divide-koko-border">
            {batches.map((b) => (
              <li key={b.id} className="flex items-start gap-3 py-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-koko-teal100 text-koko-teal">
                  {b.farmerAvatarUrl ? (
                    <img src={b.farmerAvatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold">
                      {(b.farmerName || b.farmName || '?').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-koko-ink">{b.farmName}</p>
                    <span className="badge-teal">Grade {b.quality}</span>
                  </div>
                  <p className="truncate text-xs text-koko-muted">
                    {b.village || '—'} · Harvested {b.harvestDate || '—'}
                  </p>
                </div>
                <span className="shrink-0 font-display text-xl text-koko-ink">
                  {b.weightKg}
                  <span className="ml-0.5 text-xs font-sans text-koko-muted">kg</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 text-xs text-koko-muted">
          <span className="text-koko-faint">Shipment ID</span>
          <div className="mt-1 break-all font-mono text-koko-ink">{shipment.id}</div>
        </div>
      </article>
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
