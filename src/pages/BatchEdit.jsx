import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import {
  deleteBatch,
  getBatch,
  updateBatch
} from '../utils/firestore.js';
import { validateBatch, hasErrors } from '../utils/validation.js';
import PhotoGallery from '../components/PhotoGallery.jsx';
import Spinner, { FullPageSpinner } from '../components/Spinner.jsx';

const QUALITY = ['A', 'B', 'C'];
const PROCESSING = ['Wet beans', 'Fermented', 'Dried', 'Roasted'];

export default function BatchEdit() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [batch, setBatch] = useState(null);
  const [form, setForm] = useState({
    harvestDate: '',
    weightKg: '',
    quality: 'A',
    processing: 'Fermented',
    moisturePct: '',
    notes: '',
    photoUrls: []
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const b = await getBatch(id);
        if (!active) return;
        setBatch(b);
        if (b) {
          setForm({
            harvestDate: b.harvestDate || '',
            weightKg: b.weightKg ?? '',
            quality: b.quality || 'A',
            processing: b.processing || 'Fermented',
            moisturePct: b.moisturePct ?? '',
            notes: b.notes || '',
            photoUrls: b.photoUrls || []
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  // Reset the confirm-delete state if the user pauses for >5s.
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 5000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

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

  if (batch.ownerUid !== user.uid) {
    return (
      <div className="mx-auto max-w-xl card text-center">
        <p className="eyebrow !text-koko-error">Not allowed</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">
          You don't own this batch
        </h1>
        <p className="mt-2 text-sm text-koko-body">
          Only the farmer who recorded a batch can edit it.
        </p>
        <Link to={`/batches/${id}`} className="btn-secondary mt-5 inline-flex">← View pass</Link>
      </div>
    );
  }

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validateBatch(form);
    setErrors(v);
    if (hasErrors(v)) {
      toast.error(Object.values(v)[0]);
      return;
    }
    setBusy(true);
    try {
      await updateBatch(id, {
        harvestDate: form.harvestDate,
        weightKg: Number(form.weightKg),
        quality: form.quality,
        processing: form.processing,
        moisturePct: form.moisturePct ? Number(form.moisturePct) : null,
        notes: form.notes,
        photoUrls: form.photoUrls,
        updatedAt: new Date()
      });
      toast.success('Batch updated.');
      navigate(`/batches/${id}`);
    } catch (err) {
      toast.error(err.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteBatch(id);
      toast.success('Batch deleted.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Could not delete.');
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 page">
      <header className="animate-slide-up">
        <p className="eyebrow">Editing batch</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
          {batch.farmName}
        </h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Updates appear immediately on the public verify page. Farm name, village, story
          and farmer photo were snapshotted at creation and don't change here.
        </p>
      </header>

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
              value={form.moisturePct ?? ''}
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
          />
        </Field>

        <div>
          <label className="label">Batch photos</label>
          <p className="helper mb-2">Up to 3 photos.</p>
          <PhotoGallery
            value={form.photoUrls}
            onChange={(urls) => setForm((f) => ({ ...f, photoUrls: urls }))}
            basePath={`batches/${user.uid}/${id}`}
            max={3}
            label="Add"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link to={`/batches/${id}`} className="btn-secondary">Cancel</Link>
          <button className="btn-accent" disabled={busy}>
            {busy && <Spinner size="sm" />} {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <section className="card-elevated animate-slide-up">
        <p className="eyebrow !text-koko-error">Danger zone</p>
        <h2 className="mt-1 font-display text-2xl text-koko-ink">Delete this batch</h2>
        <p className="mt-2 text-sm text-koko-body">
          Removes the batch and its provenance pass. Buyers who scan the QR after deletion
          will see a "not recognised" message. Photos in storage are not deleted.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className={`btn-danger ${confirmDelete ? '' : '!bg-white !text-koko-error border border-koko-error/40 shadow-none'}`}
          >
            {deleting && <Spinner size="sm" />}{' '}
            {deleting
              ? 'Deleting…'
              : confirmDelete
                ? 'Click again to confirm'
                : 'Delete batch'}
          </button>
          {confirmDelete && !deleting && (
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="btn-ghost"
            >
              Never mind
            </button>
          )}
        </div>
      </section>
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
      {error && (
        <p className="error-text" role="alert">
          <span aria-hidden>!</span> {error}
        </p>
      )}
    </div>
  );
}
