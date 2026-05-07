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
      <div className="card border-red-300/40 text-red-100">
        ❌ This QR code is not recognised. Please contact the seller.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card text-center">
        <div className="text-5xl">✅</div>
        <h1 className="mt-2 text-2xl font-bold">Verified KokoPass batch</h1>
        <p className="mt-1 text-sm text-koko-mist/80">
          This bag is authentic and traceable to its source farm in Samoa.
        </p>
      </div>

      <div className="card space-y-3 text-sm">
        <Row label="Farm" value={`${batch.farmName} · ${batch.village}`} />
        <Row label="Variety" value={`${batch.crop} (${batch.variety || 'n/a'})`} />
        <Row label="Harvest date" value={batch.harvestDate} />
        <Row label="Weight" value={`${batch.weightKg} kg`} />
        <Row label="Grade" value={batch.quality} />
        <Row label="Processing" value={batch.processing} />
        {batch.moisturePct != null && <Row label="Moisture" value={`${batch.moisturePct}%`} />}
        {batch.location && (
          <Row
            label="Origin"
            value={`${batch.location.lat.toFixed(4)}, ${batch.location.lng.toFixed(4)}`}
          />
        )}
        <Row label="Batch ID" value={batch.id} mono />
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-4 border-b border-koko-mist/10 pb-2 last:border-none last:pb-0">
      <div className="text-koko-mist/60">{label}</div>
      <div className={`text-right text-white ${mono ? 'font-mono break-all' : ''}`}>{value}</div>
    </div>
  );
}
