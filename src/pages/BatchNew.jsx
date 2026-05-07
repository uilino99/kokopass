import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { createBatch, getFarm } from '../utils/firestore.js';
import { validateBatch, hasErrors } from '../utils/validation.js';

const QUALITY = ['A', 'B', 'C'];
const PROCESSING = ['Wet beans', 'Fermented', 'Dried', 'Roasted'];

export default function BatchNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [farm, setFarm] = useState(null);
  const [form, setForm] = useState({
    harvestDate: new Date().toISOString().slice(0, 10),
    weightKg: '',
    quality: 'A',
    processing: 'Fermented',
    moisturePct: '',
    notes: ''
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setFarm(await getFarm(user.uid));
    })();
  }, [user.uid]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!farm) return setError('Please complete your farm profile first.');
    const errs = validateBatch(form);
    if (hasErrors(errs)) return setError(Object.values(errs)[0]);
    setBusy(true);
    try {
      const id = await createBatch({
        ownerUid: user.uid,
        farmId: user.uid,
        farmName: farm.farmName,
        village: farm.village || '',
        crop: farm.crop || 'Cacao',
        variety: farm.variety || '',
        location: farm.location || null,
        harvestDate: form.harvestDate,
        weightKg: Number(form.weightKg),
        quality: form.quality,
        processing: form.processing,
        moisturePct: form.moisturePct ? Number(form.moisturePct) : null,
        notes: form.notes
      });
      navigate(`/batches/${id}`);
    } catch (err) {
      setError(err.message || 'Could not save batch.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Record a new batch</h1>
        <p className="text-sm text-koko-mist/80">
          Each batch gets a unique QR code that buyers can scan to verify origin.
        </p>
      </div>

      {!farm && (
        <div className="card border-amber-300/40 text-amber-100">
          You need to complete your farm profile before recording a batch.{' '}
          <button onClick={() => navigate('/farm')} className="underline">Go to farm profile</button>
        </div>
      )}

      <form onSubmit={onSubmit} className="card space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Harvest date</label>
            <input className="input" type="date" required value={form.harvestDate} onChange={set('harvestDate')} />
          </div>
          <div>
            <label className="label">Weight (kg)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.1"
              required
              value={form.weightKg}
              onChange={set('weightKg')}
            />
          </div>
          <div>
            <label className="label">Quality grade</label>
            <select className="input" value={form.quality} onChange={set('quality')}>
              {QUALITY.map((q) => (
                <option key={q}>{q}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Processing</label>
            <select className="input" value={form.processing} onChange={set('processing')}>
              {PROCESSING.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Moisture % (optional)</label>
            <input
              className="input"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.moisturePct}
              onChange={set('moisturePct')}
            />
          </div>
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="input min-h-[80px]" value={form.notes} onChange={set('notes')} />
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard')}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy || !farm}>
            {busy ? 'Saving…' : 'Save & generate QR'}
          </button>
        </div>
      </form>
    </div>
  );
}
