import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { subscribeBatch } from '../utils/firestore.js';

export default function BatchView() {
  const { id } = useParams();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const qrWrap = useRef(null);

  useEffect(() => {
    const unsub = subscribeBatch(id, (b) => {
      setBatch(b);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  const verifyUrl = `${window.location.origin}/verify/${id}`;

  const downloadPng = () => {
    const canvas = qrWrap.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `kokopass-${id}.png`;
    a.click();
  };

  const printQr = () => window.print();

  if (loading) return <p className="text-koko-mist/70">Loading…</p>;
  if (!batch) return <p className="text-red-300">Batch not found.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between no-print">
        <div>
          <p className="eyebrow">Provenance pass</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">Batch QR</h1>
        </div>
        <Link to="/dashboard" className="btn-ghost">← Back</Link>
      </div>

      <article className="card-elevated grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="mx-auto flex flex-col items-center gap-3">
          <div ref={qrWrap} className="rounded-2xl bg-white p-4 shadow-gold">
            <QRCodeCanvas value={verifyUrl} size={220} level="H" includeMargin={false} />
          </div>
          <p className="text-[10px] uppercase tracking-wider2 text-koko-mist/70">
            Scan to verify
          </p>
        </div>
        <div>
          <p className="eyebrow">Verified by KokoPass</p>
          <h2 className="mt-2 font-display text-3xl">
            {batch.farmName}
            <span className="block text-base font-sans font-medium not-italic text-koko-mist/85">
              {batch.village}, Samoa
            </span>
          </h2>
          <div className="rule-gold my-5" />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Harvest" value={batch.harvestDate} />
            <Field label="Weight" value={`${batch.weightKg} kg`} />
            <Field label="Grade" value={batch.quality} />
            <Field label="Processing" value={batch.processing} />
            {batch.variety && <Field label="Variety" value={batch.variety} />}
            {batch.moisturePct != null && (
              <Field label="Moisture" value={`${batch.moisturePct}%`} />
            )}
          </dl>
          <div className="mt-5 text-xs text-koko-mist/60">
            <span className="text-koko-mist/40">Batch ID</span>
            <div className="mt-1 break-all font-mono text-koko-ivory">{batch.id}</div>
          </div>
        </div>
      </article>

      <div className="flex flex-wrap gap-3 no-print">
        <button onClick={downloadPng} className="btn-primary">⬇ Download PNG</button>
        <button onClick={printQr} className="btn-secondary">🖨 Print label</button>
        <Link to="/batches/new" className="btn-secondary">+ Record another</Link>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider2 text-koko-mist/55">{label}</dt>
      <dd className="mt-0.5 text-koko-ivory">{value}</dd>
    </div>
  );
}
