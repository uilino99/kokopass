import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { QRCodeCanvas } from 'qrcode.react';
import { db, COLLECTIONS } from '../firebase.js';

export default function BatchView() {
  const { id } = useParams();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const qrWrap = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, COLLECTIONS.batches, id), (snap) => {
      setBatch(snap.exists() ? { id: snap.id, ...snap.data() } : null);
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Batch QR pass</h1>
        <Link to="/dashboard" className="btn-ghost">← Back</Link>
      </div>

      <div className="card grid items-center gap-6 sm:grid-cols-[auto_1fr]">
        <div ref={qrWrap} className="rounded-2xl bg-white p-4">
          <QRCodeCanvas
            value={verifyUrl}
            size={220}
            level="H"
            includeMargin={false}
          />
        </div>
        <div className="space-y-2 text-sm">
          <div>
            <div className="text-koko-mist/60">Batch ID</div>
            <div className="font-mono text-white break-all">{batch.id}</div>
          </div>
          <div>
            <div className="text-koko-mist/60">Farm</div>
            <div className="text-white">{batch.farmName} · {batch.village}</div>
          </div>
          <div>
            <div className="text-koko-mist/60">Harvest</div>
            <div className="text-white">
              {batch.harvestDate} · {batch.weightKg} kg · Grade {batch.quality}
            </div>
          </div>
          <div>
            <div className="text-koko-mist/60">Verify URL</div>
            <a href={verifyUrl} className="text-koko-accent break-all hover:underline">{verifyUrl}</a>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={downloadPng} className="btn-primary">⬇ Download PNG</button>
        <button onClick={printQr} className="btn-secondary">🖨 Print label</button>
        <Link to="/batches/new" className="btn-secondary">+ Record another batch</Link>
      </div>
    </div>
  );
}
