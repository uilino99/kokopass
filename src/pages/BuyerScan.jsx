import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import {
  getBatch,
  getExport,
  parseBatchIdFromQr,
  recordScan
} from '../utils/firestore.js';
import QrScanner from '../components/QrScanner.jsx';
import Spinner from '../components/Spinner.jsx';

export default function BuyerScan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [scannerOpen, setScannerOpen] = useState(true);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manualId, setManualId] = useState('');
  const lastRef = useRef({ id: null, at: 0 });

  const resolveAndRecord = useCallback(
    async (raw) => {
      const id = parseBatchIdFromQr(raw) || raw;
      if (!id) {
        toast.error('Could not read that QR code.');
        return false;
      }
      setBusy(true);
      setPaused(true);
      try {
        // batch first, then shipment
        const batch = await getBatch(id);
        if (batch) {
          await recordScan(user.uid, {
            refId: batch.id,
            refKind: 'batch',
            summary: {
              farmName: batch.farmName || '',
              village: batch.village || '',
              weightKg: batch.weightKg ?? null,
              quality: batch.quality || '',
              harvestDate: batch.harvestDate || ''
            }
          });
          toast.success(`Saved · ${batch.farmName}`);
          navigate(`/verify/${batch.id}`);
          return true;
        }
        const ship = await getExport(id);
        if (ship) {
          await recordScan(user.uid, {
            refId: ship.id,
            refKind: 'shipment',
            summary: {
              destination: ship.destination || '',
              buyerName: ship.buyerName || '',
              totalKg: ship.totalKg ?? null,
              batchesCount: ship.batchIds?.length ?? 0,
              farmsCount: ship.farmsCount ?? null
            }
          });
          toast.success(`Saved · ${ship.destination || 'shipment'}`);
          navigate(`/verify/${ship.id}`);
          return true;
        }
        toast.error('QR not recognised. Is this a KokoPass code?');
        return false;
      } catch (err) {
        toast.error(err.message || 'Could not save scan.');
        return false;
      } finally {
        setBusy(false);
        setTimeout(() => setPaused(false), 800);
      }
    },
    [navigate, toast, user.uid]
  );

  const handleScan = useCallback(
    async (decoded) => {
      const now = Date.now();
      if (lastRef.current.id === decoded && now - lastRef.current.at < 1500) return;
      lastRef.current = { id: decoded, at: now };
      await resolveAndRecord(decoded);
    },
    [resolveAndRecord]
  );

  const onManual = async (e) => {
    e.preventDefault();
    const v = manualId.trim();
    if (!v) return;
    const ok = await resolveAndRecord(v);
    if (ok) setManualId('');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 page">
      <header className="animate-slide-up">
        <p className="eyebrow">Trace a bag</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">Scan a KokoPass</h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Point your camera at any KokoPass QR. The bag will be added to your portfolio
          automatically.
        </p>
      </header>

      <section className="card-elevated animate-slide-up">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="eyebrow">Camera</p>
            <h2 className="mt-1 font-display text-2xl text-koko-ink">Live scanner</h2>
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
            paused={paused || busy}
            onResult={handleScan}
            onError={(e) =>
              toast.error(e?.message || 'Camera unavailable. Use manual entry below.')
            }
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-koko-border bg-koko-bg/60 p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-koko-teal100 text-koko-teal">
              <span className="text-xl">📷</span>
            </div>
            <p className="mt-3 text-sm text-koko-body">
              Tap <strong>Open scanner</strong> to scan a KokoPass QR.
            </p>
          </div>
        )}

        <form onSubmit={onManual} className="mt-4 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Or paste a verify URL or batch ID…"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
          />
          <button className="btn-secondary" disabled={busy || !manualId.trim()}>
            {busy ? <Spinner size="sm" /> : 'Trace'}
          </button>
        </form>
      </section>
    </div>
  );
}
