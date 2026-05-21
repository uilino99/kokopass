import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '../utils/offline.js';

export default function OfflineBanner() {
  const online = useOnlineStatus();
  const wasOffline = useRef(false);
  const [showRecover, setShowRecover] = useState(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setShowRecover(false);
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      setShowRecover(true);
      const t = setTimeout(() => setShowRecover(false), 2200);
      return () => clearTimeout(t);
    }
  }, [online]);

  if (online && !showRecover) return null;

  const offlineTone =
    'border-koko-warning/40 text-koko-warning';
  const recoverTone =
    'border-koko-success/40 text-koko-success';

  return (
    <div
      role="status"
      className={`sticky top-16 z-20 mx-3 mt-3 rounded-2xl border px-3 py-2 text-xs font-medium shadow-md animate-slide-up no-print ${
        online ? recoverTone : offlineTone
      }`}
      style={{
        background: online
          ? 'rgba(231, 245, 238, 0.85)'
          : 'rgba(254, 243, 199, 0.88)',
        backdropFilter: 'saturate(140%) blur(8px)',
        WebkitBackdropFilter: 'saturate(140%) blur(8px)'
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2">
        <span
          className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold text-white shadow-sm ${
            online ? 'bg-koko-success' : 'bg-koko-warning'
          }`}
        >
          {online ? '✓' : '⚡'}
        </span>
        <span>
          {online
            ? 'Back online — changes synced.'
            : "You're offline — changes will sync when you reconnect."}
        </span>
      </div>
    </div>
  );
}
