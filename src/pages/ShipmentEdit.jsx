import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import {
  deleteExport,
  getExport,
  updateExport
} from '../utils/firestore.js';
import Spinner, { FullPageSpinner } from '../components/Spinner.jsx';

const STATUSES = [
  { value: 'shipped', label: 'Shipped' },
  { value: 'in-transit', label: 'In transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' }
];

export default function ShipmentEdit() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [shipment, setShipment] = useState(null);
  const [form, setForm] = useState({
    destination: '',
    buyerName: '',
    vessel: '',
    departureDate: '',
    notes: '',
    status: 'shipped'
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await getExport(id);
        if (!active) return;
        setShipment(s);
        if (s) {
          setForm({
            destination: s.destination || '',
            buyerName: s.buyerName || '',
            vessel: s.vessel || '',
            departureDate: s.departureDate || '',
            notes: s.notes || '',
            status: s.status || 'shipped'
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

  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 5000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

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

  if (shipment.ownerUid !== user.uid) {
    return (
      <div className="mx-auto max-w-xl card text-center">
        <p className="eyebrow !text-koko-error">Not allowed</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">
          You don't own this shipment
        </h1>
        <p className="mt-2 text-sm text-koko-body">
          Only the exporter who created a shipment can edit it.
        </p>
        <Link to={`/exporter/shipments/${id}`} className="btn-secondary mt-5 inline-flex">
          ← View shipment
        </Link>
      </div>
    );
  }

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.destination.trim()) {
      toast.error('Enter a destination.');
      return;
    }
    setBusy(true);
    try {
      await updateExport(id, {
        destination: form.destination.trim(),
        buyerName: form.buyerName.trim(),
        vessel: form.vessel.trim(),
        departureDate: form.departureDate,
        notes: form.notes.trim(),
        status: form.status
      });
      toast.success('Shipment updated.');
      navigate(`/exporter/shipments/${id}`);
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
      await deleteExport(id);
      toast.success('Shipment deleted.');
      navigate('/exporter');
    } catch (err) {
      toast.error(err.message || 'Could not delete.');
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 page">
      <header className="animate-slide-up">
        <p className="eyebrow">Editing shipment</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
          {shipment.destination || 'Consignment'}
        </h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Update the shipment metadata. The manifest (batches and totals) is fixed at
          creation — to add or remove batches, create a new shipment.
        </p>
      </header>

      <form onSubmit={onSubmit} noValidate className="card-elevated space-y-6 animate-slide-up">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Destination" id="destination" required>
            <input
              id="destination"
              required
              className="input"
              value={form.destination}
              onChange={set('destination')}
            />
          </Field>
          <Field label="Buyer name" id="buyerName">
            <input
              id="buyerName"
              className="input"
              value={form.buyerName}
              onChange={set('buyerName')}
            />
          </Field>
          <Field label="Vessel / booking" id="vessel">
            <input
              id="vessel"
              className="input"
              value={form.vessel}
              onChange={set('vessel')}
            />
          </Field>
          <Field label="Departure date" id="departureDate">
            <input
              id="departureDate"
              type="date"
              className="input"
              value={form.departureDate}
              onChange={set('departureDate')}
            />
          </Field>
          <Field label="Status" id="status">
            <select id="status" className="input" value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
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

        <div className="rounded-xl border border-koko-border bg-koko-bg/60 p-4 text-sm">
          <p className="eyebrow">Manifest (read-only)</p>
          <p className="mt-2 text-koko-body">
            <span className="font-display text-2xl text-koko-ink">
              {Number(shipment.totalKg || 0).toFixed(1)}
            </span>
            <span className="ml-1 text-koko-muted">kg</span>{' '}
            across {shipment.batchIds?.length || 0} batch
            {shipment.batchIds?.length === 1 ? '' : 'es'} from {shipment.farmsCount || 0} farm
            {shipment.farmsCount === 1 ? '' : 's'}.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link to={`/exporter/shipments/${id}`} className="btn-secondary">Cancel</Link>
          <button className="btn-accent" disabled={busy}>
            {busy && <Spinner size="sm" />} {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <section className="card-elevated animate-slide-up">
        <p className="eyebrow !text-koko-error">Danger zone</p>
        <h2 className="mt-1 font-display text-2xl text-koko-ink">Delete this shipment</h2>
        <p className="mt-2 text-sm text-koko-body">
          Removes the shipment and its verify pass. Buyers who scan the QR after deletion
          will see "not recognised". The underlying batches stay intact and remain
          verifiable on their own.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className={`btn-danger ${
              confirmDelete
                ? ''
                : '!bg-white !text-koko-error border border-koko-error/40 shadow-none'
            }`}
          >
            {deleting && <Spinner size="sm" />}{' '}
            {deleting
              ? 'Deleting…'
              : confirmDelete
                ? 'Click again to confirm'
                : 'Delete shipment'}
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

function Field({ label, id, hint, required, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-koko-error">*</span>}
      </label>
      {children}
      {hint && <p className="helper">{hint}</p>}
    </div>
  );
}
