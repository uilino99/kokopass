import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { subscribeBatch } from '../utils/firestore.js';
import { FullPageSpinner } from '../components/Spinner.jsx';

export default function Verify() {
  const { id } = useParams();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeBatch(id, (b) => {
      setBatch(b);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  if (loading) return <FullPageSpinner label="Verifying" />;

  if (!batch) {
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

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-widest text-koko-muted">{label}</dt>
      <dd className="mt-1 text-koko-ink">{value}</dd>
    </div>
  );
}
