import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import { createBatch, getFarm } from '../utils/firestore.js';
import { validateBatch, hasErrors } from '../utils/validation.js';
import Spinner from '../components/Spinner.jsx';

const QUALITY = ['A', 'B', 'C'];
const PROCESSING = ['Wet beans', 'Fermented', 'Dried', 'Roasted'];

export default function BatchNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [farm, setFarm] = useState(null);
  const [farmLoaded, setFarmLoaded] = useState(false);
  const [form, setForm] = useState({
    harvestDate: new Date().toISOString().slice(0, 10),
    weightKg: '',
    quality: 'A',
    processing: 'Fermented',
    moisturePct: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setFarm(await getFarm(user.uid));
      setFarmLoaded(true);
    })();
  }, [user.uid]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!farm) {
      toast.error('Please complete your farm profile first.');
      return;
    }
    const v = validateBatch(form);
    setErrors(v);
    if (hasErrors(v)) {
      toast.error(Object.values(v)[0]);
      return;
    }
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
      toast.success('Batch recorded. Generating QR pass…');
      navigate(`/batches/${id}`);
    } catch (err) {
      toast.error(err.message || 'Could not save batch.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 page">
      <header className="animate-slide-up">
        <p className="eyebrow">New harvest</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">Record a batch</h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Every batch becomes a scannable provenance pass — verifiable by any buyer, anywhere.
        </p>
      </header>

      {farmLoaded && !farm && (
        <div className="card border-koko-warning/40 bg-koko-warningBg/60 animate-slide-up">
          <div className="flex items-start gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-koko-warning text-white">!</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-koko-ink">
                Set up your farm first
              </p>
              <p className="mt-1 text-sm text-koko-body">
                You need a farm profile before you can record batches.
              </p>
              <Link to="/farm" className="btn-secondary mt-3">Go to farm profile</Link>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="card-elevated space-y-6 animate-slide-up">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Harvest date" id="harvestDate" required error={errors.harvestDate}>
            <input
              id="harvestDate"
              type="date"
              required
              className={`input ${errors.harvestDate ? 'input-error' : ''}`}
              value={form.harvestDate}
              onChange={set('harvestDate')}
            />
          </Field>
          <Field label="Weight (kg)" id="weight" required error={errors.weightKg}>
            <input
              id="weight"
              type="number"
              min="0"
              step="0.1"
              required
              className={`input ${errors.weightKg ? 'input-error' : ''}`}
              value={form.weightKg}
              onChange={set('weightKg')}
            />
          </Field>
          <Field label="Quality grade" id="quality">
            <select id="quality" className="input" value={form.quality} onChange={set('quality')}>
              {QUALITY.map((q) => <option key={q}>{q}</option>)}
            </select>
          </Field>
          <Field label="Processing" id="processing">
            <select id="processing" className="input" value={form.processing} onChange={set('processing')}>
              {PROCESSING.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Moisture %" id="moisture" hint="Optional">
            <input
              id="moisture"
              type="number"
              min="0"
              max="100"
              step="0.1"
              className="input"
              value={form.moisturePct}
              onChange={set('moisturePct')}
            />
          </Field>
        </div>
        <Field label="Notes" id="notes" hint="Optional">
          <textarea
            id="notes"
            className="input"
            value={form.notes}
            onChange={set('notes')}
            placeholder="Anything notable about this lot…"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard')}>
            Cancel
          </button>
          <button className="btn-accent" disabled={busy || !farm}>
            {busy && <Spinner size="sm" />} {busy ? 'Saving…' : 'Save & generate QR'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, id, hint, error, required, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-koko-error">*</span>}
      </label>
      {children}
      {hint && !error && <p className="helper">{hint}</p>}
      {error && <p className="error-text" role="alert"><span aria-hidden>!</span> {error}</p>}
    </div>
  );
}
