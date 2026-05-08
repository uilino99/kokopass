import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getBatch, getExport, subscribeBatch } from '../utils/firestore.js';
import { FullPageSpinner } from '../components/Spinner.jsx';

export default function Verify() {
  const { id } = useParams();
  const [kind, setKind] = useState(null); // 'batch' | 'shipment' | 'missing'
  const [data, setData] = useState(null);
  const [shipmentBatches, setShipmentBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Resolve the QR target — try batches first, then exports.
  useEffect(() => {
    let active = true;
    let unsubBatch = null;

    (async () => {
      const batch = await getBatch(id);
      if (!active) return;
      if (batch) {
        // Subscribe live to keep verify page real-time.
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

  if (kind === 'shipment') return <ShipmentView shipment={data} batches={shipmentBatches} />;
  return <BatchView batch={data} />;
}

function BatchView({ batch }) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 page">
      <div className="card-elevated text-center animate-slide-up">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-koko-teal100 text-koko-teal animate-bounce-sm">
          <span className="text-2xl">✓</span>
        </div>
        <p className="eyebrow mt-3">Verified provenance</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
          Authentic <span className="italic text-koko-teal">KokoPass</span>
        </h1>
        <div className="divider-teal mt-5" />
        <p className="mt-5 text-sm text-koko-body sm:text-base">
          This bag is traceable to its source farm in Samoa.
        </p>
      </div>

      <article className="card-elevated animate-slide-up">
        <p className="eyebrow">Origin</p>
        <h2 className="mt-2 font-display text-3xl text-koko-ink">
          {batch.farmName}
          <span className="block text-base font-sans font-medium text-koko-muted">
            {batch.village}, Samoa
          </span>
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
        <div className="mt-6 text-xs text-koko-muted">
          <span className="text-koko-faint">Batch ID</span>
          <div className="mt-1 break-all font-mono text-koko-ink">{batch.id}</div>
        </div>
      </article>
    </div>
  );
}

function ShipmentView({ shipment, batches }) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 page">
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
              <li key={b.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
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
