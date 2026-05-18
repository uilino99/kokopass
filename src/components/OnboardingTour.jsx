import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_PREFIX = 'koko:tour-seen-';

const STEPS_BY_ROLE = {
  farmer: [
    {
      icon: '🌱',
      title: 'Welcome to KokoPass',
      body:
        'Every batch you record becomes a public QR pass that buyers can scan to verify origin. Three steps to get going.'
    },
    {
      icon: '🏞',
      title: 'Set up your farm',
      body:
        'Add your village, crop, photos and (optionally) a boundary polygon. This story travels with every bag.',
      cta: { to: '/farm', label: 'Open farm profile' }
    },
    {
      icon: '📦',
      title: 'Record a batch',
      body:
        'Date, weight, grade — each batch mints a unique QR code linked to your verified profile.',
      cta: { to: '/batches/new', label: 'New batch' }
    },
    {
      icon: '🖨',
      title: 'Print bag labels',
      body:
        'Print 9 QR labels per A4 page. Stick on each bag. Buyers scan and see your farm.',
      cta: { to: '/batches/print', label: 'Print labels' }
    }
  ],
  exporter: [
    {
      icon: '📦',
      title: 'Welcome, exporter',
      body:
        'Aggregate verified farmer batches into shipments, then mint a single QR for each consignment.'
    },
    {
      icon: '🏢',
      title: 'Publish your profile',
      body:
        'A public page on /exporters where buyers find you. Add your story, regions and contact details.',
      cta: { to: '/exporter/profile', label: 'Edit profile' }
    },
    {
      icon: '📷',
      title: 'Scan farmer QRs',
      body:
        'Build a shipment by scanning farmer bags. The manifest auto-totals kg and farms covered.',
      cta: { to: '/exporter/shipments/new', label: 'New shipment' }
    },
    {
      icon: '✉',
      title: 'Watch your inbox',
      body:
        'Inquiries from your public profile land in your Inbox tab. Reply via email or phone from one click.',
      cta: { to: '/exporter/inquiries', label: 'Open inbox' }
    }
  ],
  buyer: [
    {
      icon: '🔎',
      title: 'Welcome to your portfolio',
      body:
        'Scan any KokoPass QR and it lands here automatically with the farm, kg and harvest date.'
    },
    {
      icon: '📷',
      title: 'Scan your first pass',
      body:
        'Use your phone camera at a tasting, or paste a verify URL on desktop.',
      cta: { to: '/buyer/scan', label: 'Open scanner' }
    },
    {
      icon: '🏷',
      title: 'Tag and note',
      body:
        'Add private notes and tags to each scan. Searchable later for sourcing shortlists.'
    },
    {
      icon: '⬇',
      title: 'Export your data',
      body:
        'Download your portfolio as CSV any time — name, kg, quality, notes, tags, the lot.'
    }
  ],
  enroller: [
    {
      icon: '🌱',
      title: 'Pilot enrolment',
      body:
        'Pre-register farmers ahead of their first sign-in. Each enrolment gets a 6-char claim code.'
    },
    {
      icon: '➕',
      title: 'Add a farmer',
      body:
        'Single-add form for quick on-site captures, with sticky village across submits.',
      cta: { to: '/enroll/new', label: 'New farmer' }
    },
    {
      icon: '📋',
      title: 'Or bulk-paste a CSV',
      body:
        'From your field roster — name + village required, everything else optional.',
      cta: { to: '/enroll/bulk', label: 'Bulk paste' }
    },
    {
      icon: '🖨',
      title: 'Print claim cards',
      body:
        '8 per A4. Each card has a QR + code; the farmer scans to register and inherit their record.',
      cta: { to: '/enroll/print', label: 'Print cards' }
    }
  ]
};

/**
 * Inline onboarding overlay. Fires once per role on first dashboard
 * mount; persists dismissal in localStorage at koko:tour-seen-<role>.
 *
 * Force-show via the `force` prop (used by Settings → "Replay tour").
 */
export default function OnboardingTour({ role, force = false, onClose }) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const steps = STEPS_BY_ROLE[role] || STEPS_BY_ROLE.farmer;
  const key = `${STORAGE_PREFIX}${role}`;

  useEffect(() => {
    if (force) {
      setActive(true);
      setStep(0);
      return;
    }
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(key)) return;
    // Brief delay so the dashboard finishes its slide-up animation.
    const t = setTimeout(() => setActive(true), 700);
    return () => clearTimeout(t);
  }, [key, force]);

  const dismiss = () => {
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* ignore */
    }
    setActive(false);
    setStep(0);
    onClose?.();
  };

  const next = () => {
    if (step >= steps.length - 1) {
      dismiss();
      return;
    }
    setStep(step + 1);
  };

  if (!active) return null;
  const cur = steps[step];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding tour"
      className="fixed inset-0 z-50 flex items-end justify-center bg-koko-ink/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className="card-elevated w-full max-w-md animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-koko-teal100 text-koko-teal">
            <span className="text-2xl">{cur.icon || '✨'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">
              Step {step + 1} of {steps.length}
            </p>
            <h3 className="mt-1 font-display text-2xl text-koko-ink">{cur.title}</h3>
            <p className="mt-2 text-sm text-koko-body">{cur.body}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={dismiss} className="btn-ghost">
            {step === steps.length - 1 ? 'Close' : 'Skip tour'}
          </button>
          <div className="flex gap-2">
            {cur.cta && (
              <Link to={cur.cta.to} onClick={dismiss} className="btn-secondary">
                {cur.cta.label} →
              </Link>
            )}
            <button type="button" onClick={next} className="btn-accent">
              {step === steps.length - 1 ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-koko-teal' : 'w-1.5 bg-koko-border'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
