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
        className="inline-flex items-center gap-2 rounded-full border border-koko-warning/40 bg-koko-warningBg px-3 py-1.5 text-xs font-semibold text-koko-warning"
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
        className="inline-flex items-center gap-2 rounded-full border border-koko-border bg-koko-bg/80 px-3 py-1.5 text-xs font-semibold text-koko-muted"
        role="status"
        aria-live="polite"
      >
        <span className="grid h-4 w-4 place-items-center rounded-full bg-koko-warning text-[10px] font-bold text-white">
          ⚡
        </span>
        Offline · queued
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-koko-success/40 bg-koko-successBg px-3 py-1.5 text-xs font-semibold text-koko-success"
      role="status"
      aria-live="polite"
    >
      <span className="grid h-4 w-4 place-items-center rounded-full bg-koko-success text-[10px] font-bold text-white">
        ✓
      </span>
      All synced
    </span>
  );
}
