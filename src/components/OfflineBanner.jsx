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
    'border-koko-warning/50 bg-koko-warningBg text-koko-warning';
  const recoverTone =
    'border-koko-success/40 bg-koko-successBg text-koko-success';

  return (
    <div
      role="status"
      className={`sticky top-16 z-20 mx-3 mt-3 rounded-xl border px-3 py-2 text-xs font-medium shadow-sm animate-slide-up no-print ${
        online ? recoverTone : offlineTone
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2">
        <span
          className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${
            online ? 'bg-koko-success text-white' : 'bg-koko-warning text-white'
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
