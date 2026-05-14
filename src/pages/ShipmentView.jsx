import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { getBatch, subscribeExport } from '../utils/firestore.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import { FullPageSpinner } from '../components/Spinner.jsx';

export default function ShipmentView() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const qrWrap = useRef(null);

  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeExport(id, (s) => {
      setShipment(s);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!shipment?.batchIds?.length) {
      setBatches([]);
      setBatchesLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setBatchesLoading(true);
      const rows = await Promise.all(shipment.batchIds.map((bid) => getBatch(bid)));
      if (active) {
        setBatches(rows.filter(Boolean));
        setBatchesLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [shipment]);

  const verifyUrl = `${window.location.origin}/verify/${id}`;

  const downloadPng = () => {
    const canvas = qrWrap.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `kokopass-shipment-${id}.png`;
    a.click();
    toast.success('QR downloaded.');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      toast.success('Verify link copied.');
    } catch {
      toast.error('Could not copy link.');
    }
  };

  if (loading) return <FullPageSpinner label="Loading shipment" />;
  if (!shipment) {
    return (
      <div className="mx-auto max-w-xl card text-center">
        <p className="eyebrow !text-koko-error">Not found</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">Shipment not found</h1>
        <Link to="/exporter" className="btn-secondary mt-5 inline-flex">← Back</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 page">
      <div className="flex items-end justify-between no-print animate-slide-up">
        <div>
          <p className="eyebrow">Shipment QR</p>
          <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
            {shipment.destination || 'Consignment'}
          </h1>
          {shipment.buyerName && (
            <p className="mt-1 text-sm text-koko-body">to {shipment.buyerName}</p>
          )}
        </div>
        <Link to="/exporter" className="btn-ghost">← Back</Link>
      </div>

      <article className="card-elevated grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center animate-slide-up">
        <div className="mx-auto flex flex-col items-center gap-3">
          <div ref={qrWrap} className="rounded-2xl border border-koko-border bg-white p-4 shadow-md">
            <QRCodeCanvas value={verifyUrl} size={220} level="H" includeMargin={false} fgColor="#003366" />
          </div>
          <p className="text-2xs uppercase tracking-widest text-koko-muted">Scan to verify</p>
        </div>
        <div>
          <p className="eyebrow">Verified consignment</p>
          <h2 className="mt-2 font-display text-3xl text-koko-ink">
            {shipment.totalKg?.toFixed?.(1) ?? 0} kg
            <span className="block text-base font-sans font-medium text-koko-muted">
              {shipment.batchIds?.length || 0} batches · {shipment.farmsCount || 0} farms
            </span>
          </h2>
          <div className="divider" />
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Destination" value={shipment.destination || '—'} />
            <Field label="Buyer" value={shipment.buyerName || '—'} />
            <Field label="Departure" value={shipment.departureDate || '—'} />
            <Field label="Vessel" value={shipment.vessel || '—'} />
            <Field label="Status" value={<span className="badge-navy">{shipment.status || 'shipped'}</span>} />
          </dl>
          <div className="mt-5 text-xs text-koko-muted">
            <span className="text-koko-faint">Shipment ID</span>
            <div className="mt-1 break-all font-mono text-koko-ink">{shipment.id}</div>
          </div>
        </div>
      </article>

      <section className="card-elevated animate-slide-up">
        <p className="eyebrow">Manifest</p>
        <h2 className="mt-1 font-display text-2xl text-koko-ink">Batches</h2>

        {batchesLoading && (
          <p className="mt-4 text-sm text-koko-muted">Loading manifest…</p>
        )}

        {!batchesLoading && batches.length === 0 && (
          <p className="mt-4 text-sm text-koko-muted">No batches in this shipment.</p>
        )}

        {!batchesLoading && batches.length > 0 && (
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
                  <p className="mt-1 font-mono text-2xs text-koko-faint">{b.id}</p>
                </div>
                <span className="shrink-0 font-display text-xl text-koko-ink">
                  {b.weightKg}
                  <span className="ml-0.5 text-xs font-sans text-koko-muted">kg</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-3 no-print">
        <button onClick={downloadPng} className="btn-accent">⬇ Download QR PNG</button>
        <button onClick={() => window.print()} className="btn-secondary">🖨 Print manifest</button>
        <button onClick={copyLink} className="btn-secondary">⧉ Copy verify link</button>
        {user?.uid === shipment.ownerUid && (
          <Link to={`/exporter/shipments/${shipment.id}/edit`} className="btn-secondary">
            ✎ Edit
          </Link>
        )}
        <Link to="/exporter/shipments/new" className="btn-secondary">+ New shipment</Link>
      </div>
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
