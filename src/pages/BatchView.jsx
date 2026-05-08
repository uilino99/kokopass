import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { subscribeBatch } from '../utils/firestore.js';
import { useToast } from '../components/Toast.jsx';
import { FullPageSpinner } from '../components/Spinner.jsx';

export default function BatchView() {
  const { id } = useParams();
  const toast = useToast();
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
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `kokopass-${id}.png`;
    a.click();
    toast.success('QR PNG downloaded.');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      toast.success('Verify link copied.');
    } catch {
      toast.error('Could not copy link.');
    }
  };

  if (loading) return <FullPageSpinner label="Loading batch" />;
  if (!batch) {
    return (
      <div className="mx-auto max-w-xl card text-center">
        <p className="eyebrow !text-koko-error">Not found</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">Batch not found</h1>
        <Link to="/dashboard" className="btn-secondary mt-5 inline-flex">← Back</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 page">
      <div className="flex items-end justify-between no-print animate-slide-up">
        <div>
          <p className="eyebrow">Provenance pass</p>
          <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">Batch QR</h1>
        </div>
        <Link to="/dashboard" className="btn-ghost">← Back</Link>
      </div>

      <article className="card-elevated grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center animate-slide-up">
        <div className="mx-auto flex flex-col items-center gap-3">
          <div ref={qrWrap} className="rounded-2xl border border-koko-border bg-white p-4 shadow-md">
            <QRCodeCanvas value={verifyUrl} size={220} level="H" includeMargin={false} fgColor="#003366" />
          </div>
          <p className="text-2xs uppercase tracking-widest text-koko-muted">Scan to verify</p>
        </div>
        <div>
          <p className="eyebrow">Verified by KokoPass</p>
          <h2 className="mt-2 font-display text-3xl text-koko-ink">
            {batch.farmName}
            <span className="block text-base font-sans font-medium text-koko-muted">
              {batch.village}, Samoa
            </span>
          </h2>
          <div className="divider" />
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Harvest" value={batch.harvestDate} />
            <Field label="Weight" value={`${batch.weightKg} kg`} />
            <Field label="Grade" value={<span className="badge-teal">{batch.quality}</span>} />
            <Field label="Processing" value={batch.processing} />
            {batch.variety && <Field label="Variety" value={batch.variety} />}
            {batch.moisturePct != null && (
              <Field label="Moisture" value={`${batch.moisturePct}%`} />
            )}
          </dl>
          <div className="mt-5 text-xs text-koko-muted">
            <span className="text-koko-faint">Batch ID</span>
            <div className="mt-1 break-all font-mono text-koko-ink">{batch.id}</div>
          </div>
        </div>
      </article>

      {batch.photoUrls?.length > 0 && (
        <section className="animate-slide-up">
          <p className="eyebrow">Photos on this pass</p>
          <div
            className="mt-3 grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${Math.min(batch.photoUrls.length, 3)}, minmax(0, 1fr))`
            }}
          >
            {batch.photoUrls.map((url) => (
              <img
                key={url}
                src={url}
                alt="Batch"
                className="aspect-square w-full rounded-2xl border border-koko-border object-cover shadow-sm"
                loading="lazy"
              />
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-3 no-print">
        <button onClick={downloadPng} className="btn-accent">⬇ Download PNG</button>
        <button onClick={() => window.print()} className="btn-secondary">🖨 Print label</button>
        <button onClick={copyLink} className="btn-secondary">⧉ Copy link</button>
        <Link to="/batches/new" className="btn-secondary">+ Record another</Link>
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
