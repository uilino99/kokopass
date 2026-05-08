import { useEffect, useState } from 'react';

const KEY = 'koko:install-dismissed';

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true);

const isIos = () =>
  typeof navigator !== 'undefined' &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !/crios|fxios|edgios/i.test(navigator.userAgent); // real Safari

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [iosOpen, setIosOpen] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1'
  );

  useEffect(() => {
    if (installed || dismissed) return;
    const onBip = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari has no event — show a static instructions banner.
    if (isIos()) {
      const t = setTimeout(() => setIosOpen(true), 4000);
      return () => clearTimeout(t);
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [installed, dismissed]);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {}
    setDismissed(true);
    setIosOpen(false);
    setDeferred(null);
  };

  const install = async () => {
    if (!deferred) return;
    try {
      deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice?.outcome === 'dismissed') dismiss();
      setDeferred(null);
    } catch {
      setDeferred(null);
    }
  };

  if (installed || dismissed) return null;
  if (!deferred && !iosOpen) return null;

  return (
    <aside
      className="fixed inset-x-3 z-40 animate-slide-up md:inset-x-auto md:right-4 md:max-w-sm"
      style={{ bottom: 'calc(5.25rem + env(safe-area-inset-bottom))' }}
      role="complementary"
    >
      <div className="card-elevated">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-koko-teal100 text-koko-teal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Install KokoPass</p>
            <p className="mt-1 text-sm text-koko-body">
              {iosOpen
                ? 'Tap the Share button, then "Add to Home Screen" to install.'
                : 'Add KokoPass to your home screen for fast access and offline use.'}
            </p>
            <div className="mt-3 flex gap-2">
              {!iosOpen && (
                <button onClick={install} className="btn-accent !min-h-[40px] !px-4 !py-2">
                  Install
                </button>
              )}
              <button onClick={dismiss} className="btn-ghost !min-h-[40px]">
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
