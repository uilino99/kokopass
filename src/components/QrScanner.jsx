import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const REGION_ID = 'koko-qr-region';

export default function QrScanner({ onResult, onError, paused = false }) {
  const ref = useRef(null);
  const scannerRef = useRef(null);
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(REGION_ID, /* verbose */ false);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (vw, vh) => {
              const size = Math.min(vw, vh) * 0.75;
              return { width: size, height: size };
            },
            aspectRatio: 1.0
          },
          (decoded) => {
            if (!mounted) return;
            onResult?.(decoded);
          },
          () => {
            // per-frame decode failures are normal; ignore
          }
        );
        if (mounted) setStarting(false);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || 'Could not start camera.');
        setStarting(false);
        onError?.(err);
      }
    };

    start();

    return () => {
      mounted = false;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop()
          .catch(() => {})
          .finally(() => s.clear().catch(() => {}));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const s = scannerRef.current;
    if (!s) return;
    if (paused) {
      s.pause(true);
    } else {
      try { s.resume(); } catch { /* not paused */ }
    }
  }, [paused]);

  return (
    <div className="space-y-3">
      <div
        id={REGION_ID}
        ref={ref}
        className="overflow-hidden rounded-2xl border border-koko-border bg-black"
        style={{ minHeight: 280 }}
      />
      {starting && (
        <p className="text-xs text-koko-muted">Requesting camera permission…</p>
      )}
      {error && (
        <div className="card border-koko-error/30 bg-koko-errorBg/50">
          <p className="text-sm text-koko-error">
            Camera unavailable: {error}
          </p>
          <p className="mt-1 text-xs text-koko-muted">
            You can enter a batch ID manually below.
          </p>
        </div>
      )}
    </div>
  );
}
