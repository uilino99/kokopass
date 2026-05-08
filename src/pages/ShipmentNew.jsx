import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import {
  createExport,
  getBatch,
  parseBatchIdFromQr
} from '../utils/firestore.js';
import QrScanner from '../components/QrScanner.jsx';
import Spinner from '../components/Spinner.jsx';

export default function ShipmentNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [scannerOpen, setScannerOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const lastScanRef = useRef({ id: null, at: 0 });

  const [items, setItems] = useState([]); // [{ id, weightKg, quality, farmName, village }]
  const [meta, setMeta] = useState({
    destination: '',
    buyerName: '',
    vessel: '',
    departureDate: new Date().toISOString().slice(0, 10),
    notes: ''
  });
  const [busy, setBusy] = useState(false);
  const [manualId, setManualId] = useState('');
  const [adding, setAdding] = useState(false);

  const totalKg = items.reduce((acc, i) => acc + (Number(i.weightKg) || 0), 0);
  const farmsCount = new Set(items.map((i) => i.farmId || i.farmName)).size;

  const setMetaField = (k) => (e) =>
    setMeta((m) => ({ ...m, [k]: e.target.value }));

  const tryAddBatch = useCallback(
    async (rawId) => {
      const id = parseBatchIdFromQr(rawId) || rawId;
      if (!id) {
        toast.error('Could not read that QR code.');
        return false;
      }
      if (items.some((i) => i.id === id)) {
        toast.info('That batch is already in this shipment.');
        return false;
      }
      setAdding(true);
      try {
        const b = await getBatch(id);
        if (!b) {
          toast.error('Batch not recognised. Is this a KokoPass QR?');
          return false;
        }
        setItems((arr) => [
          ...arr,
          {
            id: b.id,
            weightKg: b.weightKg,
            quality: b.quality,
            farmId: b.farmId,
            farmName: b.farmName,
            village: b.village,
            harvestDate: b.harvestDate
          }
        ]);
        toast.success(`Added ${b.farmName} · ${b.weightKg} kg`);
        return true;
      } catch (err) {
        toast.error(err.message || 'Could not load that batch.');
        return false;
      } finally {
        setAdding(false);
      }
    },
    [items, toast]
  );

  const handleScan = useCallback(
    async (decoded) => {
      // Debounce: ignore if same payload within 1.5s
      const now = Date.now();
      if (lastScanRef.current.id === decoded && now - lastScanRef.current.at < 1500) return;
      lastScanRef.current = { id: decoded, at: now };

      setPaused(true);
      const ok = await tryAddBatch(decoded);
      // Resume after a short pause regardless of outcome
      setTimeout(() => setPaused(false), 800);
      if (!ok) return;
    },
    [tryAddBatch]
  );

  const remove = (id) =>
    setItems((arr) => arr.filter((i) => i.id !== id));

  const handleManualAdd = async (e) => {
    e.preventDefault();
    const id = manualId.trim();
    if (!id) return;
    const ok = await tryAddBatch(id);
    if (ok) setManualId('');
  };

  const submit = async () => {
    if (items.length === 0) return toast.error('Add at least one batch.');
    if (!meta.destination.trim()) return toast.error('Enter a destination.');
    setBusy(true);
    try {
      const id = await createExport({
        ownerUid: user.uid,
        destination: meta.destination.trim(),
        buyerName: meta.buyerName.trim(),
        vessel: meta.vessel.trim(),
        departureDate: meta.departureDate,
        notes: meta.notes.trim(),
        batchIds: items.map((i) => i.id),
        totalKg,
        farmsCount,
        status: 'shipped'
      });
      toast.success('Shipment created.');
      navigate(`/exporter/shipments/${id}`);
    } catch (err) {
      toast.error(err.message || 'Could not create shipment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 page">
      <header className="animate-slide-up">
        <p className="eyebrow">New consignment</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">Build a shipment</h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Scan farmer QR codes to add verified batches, then add shipment details.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Scanner panel */}
        <section className="card-elevated animate-slide-up">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow">Step 1</p>
              <h2 className="mt-1 font-display text-2xl text-koko-ink">Scan batches</h2>
            </div>
            <button
              type="button"
              onClick={() => setScannerOpen((s) => !s)}
              className={scannerOpen ? 'btn-secondary' : 'btn-accent'}
            >
              {scannerOpen ? 'Stop camera' : '📷 Open scanner'}
            </button>
          </div>

          {scannerOpen ? (
            <QrScanner
              paused={paused || adding}
              onResult={handleScan}
              onError={(e) =>
                toast.error(e?.message || 'Camera unavailable. Use manual entry.')
              }
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-koko-border bg-koko-bg/60 p-8 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-koko-teal100 text-koko-teal">
                <span className="text-xl">📷</span>
              </div>
              <p className="mt-3 text-sm text-koko-body">
                Tap <strong>Open scanner</strong> to scan a farmer QR pass.
              </p>
            </div>
          )}

          <form onSubmit={handleManualAdd} className="mt-4 flex gap-2">
            <input
              className="input flex-1"
              placeholder="Or paste a batch ID…"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
            />
            <button className="btn-secondary" disabled={adding || !manualId.trim()}>
              {adding ? <Spinner size="sm" /> : 'Add'}
            </button>
          </form>

          <p className="helper">
            {items.length} batch{items.length === 1 ? '' : 'es'} · {totalKg.toFixed(1)} kg ·{' '}
            {farmsCount} farm{farmsCount === 1 ? '' : 's'}
          </p>
        </section>

        {/* Cart panel */}
        <section className="card-elevated animate-slide-up">
          <p className="eyebrow">Manifest</p>
          <h2 className="mt-1 font-display text-2xl text-koko-ink">Batches in this shipment</h2>

          {items.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-koko-border bg-koko-bg/60 p-6 text-center text-sm text-koko-muted">
              Nothing added yet. Scan a farmer QR or paste a batch ID.
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-koko-border">
              {items.map((b) => (
                <li key={b.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-koko-ink">{b.farmName}</p>
                      <span className="badge-teal">Grade {b.quality}</span>
                    </div>
                    <p className="truncate text-xs text-koko-muted">
                      {b.village || '—'} · Harvested {b.harvestDate || '—'}
                    </p>
                    <p className="mt-1 font-mono text-2xs text-koko-faint">{b.id}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-display text-xl text-koko-ink">
                      {b.weightKg}
                      <span className="ml-0.5 text-xs font-sans text-koko-muted">kg</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(b.id)}
                      className="text-koko-muted transition hover:text-koko-error"
                      aria-label={`Remove ${b.farmName}`}
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Shipment metadata */}
      <section className="card-elevated animate-slide-up">
        <p className="eyebrow">Step 2</p>
        <h2 className="mt-1 font-display text-2xl text-koko-ink">Shipment details</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Destination" required>
            <input
              className="input"
              placeholder="e.g. Tokyo, Japan"
              value={meta.destination}
              onChange={setMetaField('destination')}
            />
          </Field>
          <Field label="Buyer name">
            <input
              className="input"
              placeholder="e.g. Bean & Bar Co."
              value={meta.buyerName}
              onChange={setMetaField('buyerName')}
            />
          </Field>
          <Field label="Vessel / booking">
            <input
              className="input"
              placeholder="e.g. MV Pacific Star · BK1234"
              value={meta.vessel}
              onChange={setMetaField('vessel')}
            />
          </Field>
          <Field label="Departure date">
            <input
              type="date"
              className="input"
              value={meta.departureDate}
              onChange={setMetaField('departureDate')}
            />
          </Field>
        </div>
        <Field label="Notes" hint="Optional">
          <textarea
            className="input mt-5"
            value={meta.notes}
            onChange={setMetaField('notes')}
          />
        </Field>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="text-sm text-koko-muted">
            <span className="font-display text-2xl text-koko-ink">{totalKg.toFixed(1)} kg</span>{' '}
            across {items.length} batch{items.length === 1 ? '' : 'es'} from {farmsCount} farm
            {farmsCount === 1 ? '' : 's'}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/exporter')}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              className="btn-accent"
              disabled={busy || items.length === 0 || !meta.destination.trim()}
            >
              {busy && <Spinner size="sm" />} {busy ? 'Creating…' : 'Create shipment'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-koko-error">*</span>}
      </label>
      {children}
      {hint && <p className="helper">{hint}</p>}
    </div>
  );
}
