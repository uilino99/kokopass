import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { subscribeBatch } from '../utils/firestore.js';

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

  if (loading) return <p className="text-koko-mist/70">Verifying…</p>;
  if (!batch) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card-elevated text-center">
          <p className="eyebrow text-red-300">Not recognised</p>
          <h1 className="mt-2 font-display text-3xl">This QR code is not a KokoPass</h1>
          <div className="divider-gold mt-4" />
          <p className="mt-4 text-sm text-koko-mist/85">
            We couldn't verify this code. Please contact the seller.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="card-elevated text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-koko-gold/40 bg-koko-gold/10">
          <span className="text-2xl">✓</span>
        </div>
        <p className="eyebrow mt-3">Verified provenance</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">
          Authentic <span className="italic text-koko-gold">KokoPass</span>
        </h1>
        <div className="divider-gold mt-5" />
        <p className="mt-5 text-sm text-koko-mist/85 sm:text-base">
          This bag is traceable to its source farm in Samoa.
        </p>
      </div>

      <article className="card-elevated">
        <p className="eyebrow">Origin</p>
        <h2 className="mt-2 font-display text-3xl">
          {batch.farmName}
          <span className="block text-base font-sans font-medium not-italic text-koko-mist/85">
            {batch.village}, Samoa
          </span>
        </h2>
        <div className="rule-gold my-6" />
        <dl className="grid grid-cols-2 gap-y-4 sm:grid-cols-3">
          <Field label="Variety" value={`${batch.crop}${batch.variety ? ` · ${batch.variety}` : ''}`} />
          <Field label="Harvest" value={batch.harvestDate} />
          <Field label="Weight" value={`${batch.weightKg} kg`} />
          <Field label="Grade" value={batch.quality} />
          <Field label="Processing" value={batch.processing} />
          {batch.moisturePct != null && <Field label="Moisture" value={`${batch.moisturePct}%`} />}
          {batch.location && (
            <Field
              label="Coordinates"
              value={`${batch.location.lat.toFixed(4)}, ${batch.location.lng.toFixed(4)}`}
            />
          )}
        </dl>
        <div className="mt-6 text-xs text-koko-mist/55">
          <span className="text-koko-mist/40">Batch ID</span>
          <div className="mt-1 break-all font-mono text-koko-ivory">{batch.id}</div>
        </div>
      </article>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider2 text-koko-mist/55">{label}</dt>
      <dd className="mt-1 text-koko-ivory">{value}</dd>
    </div>
  );
}
