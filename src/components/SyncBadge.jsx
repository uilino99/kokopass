import { useOnlineStatus } from '../utils/offline.js';

/**
 * Inline sync status pill. Used on field-agent surfaces so the agent
 * sees at a glance whether their last write has actually reached the
 * server. Renders one of three states:
 *
 *   - Pending  ("3 pending sync" + spinning glyph)  — local-only writes
 *   - Offline  ("Offline · queued")                 — network down
 *   - Synced   ("✓ All synced")                     — quiet steady state
 */
export default function SyncBadge({ pending = 0 }) {
  const online = useOnlineStatus();

  if (pending > 0) {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full border border-koko-warning/30 bg-koko-warningBg/90 px-3 py-1.5 text-xs font-semibold text-koko-warning shadow-sm"
        role="status"
        aria-live="polite"
      >
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        {pending} pending sync
      </span>
    );
  }

  if (!online) {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full border border-koko-borderSoft bg-white/80 px-3 py-1.5 text-xs font-semibold text-koko-muted shadow-sm"
        role="status"
        aria-live="polite"
      >
        <span className="grid h-4 w-4 place-items-center rounded-full bg-koko-warning text-[10px] font-bold text-white shadow-sm">
          ⚡
        </span>
        Offline · queued
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-koko-success/30 bg-koko-successBg/90 px-3 py-1.5 text-xs font-semibold text-koko-success shadow-sm"
      role="status"
      aria-live="polite"
    >
      <span className="grid h-4 w-4 place-items-center rounded-full bg-koko-success text-[10px] font-bold text-white shadow-sm">
        ✓
      </span>
      All synced
    </span>
  );
}
