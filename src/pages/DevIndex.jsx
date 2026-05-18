import { Link } from 'react-router-dom';

/**
 * Dev-only preview index. Lists every signed-in surface with a one-
 * click "Preview" link that injects ?devUser=<role> via the
 * AuthContext mock-auth path. Auto-disabled in production builds.
 *
 * Note on data: previews render with the real components but a fake
 * UID, so most lists will show their empty / no-data states. The page
 * chrome, navigation, role badges, CTAs and OnboardingTour are all
 * fully visible — which is what you want for visual review.
 */

const SECTIONS = [
  {
    role: 'farmer',
    label: 'Farmer',
    routes: [
      { to: '/dashboard?devUser=farmer', label: 'Dashboard' },
      { to: '/farm?devUser=farmer', label: 'Farm profile' },
      { to: '/batches/new?devUser=farmer', label: 'New batch' },
      { to: '/batches/print?devUser=farmer', label: 'Print labels' }
    ]
  },
  {
    role: 'exporter',
    label: 'Exporter',
    routes: [
      { to: '/dashboard?devUser=exporter', label: 'Dashboard' },
      { to: '/exporter?devUser=exporter', label: 'Shipments dashboard' },
      { to: '/exporter/profile?devUser=exporter', label: 'Profile editor' },
      { to: '/exporter/shipments/new?devUser=exporter', label: 'New shipment' },
      { to: '/exporter/inquiries?devUser=exporter', label: 'Inquiries inbox' }
    ]
  },
  {
    role: 'buyer',
    label: 'Buyer',
    routes: [
      { to: '/dashboard?devUser=buyer', label: 'Portfolio' },
      { to: '/buyer?devUser=buyer', label: 'Buyer dashboard' },
      { to: '/buyer/scan?devUser=buyer', label: 'Scan a pass' }
    ]
  },
  {
    role: 'enroller',
    label: 'Enroller',
    routes: [
      { to: '/dashboard?devUser=enroller', label: 'Enrolment dashboard' },
      { to: '/enroll?devUser=enroller', label: 'Roster' },
      { to: '/enroll/new?devUser=enroller', label: 'Add a farmer' },
      { to: '/enroll/bulk?devUser=enroller', label: 'Bulk CSV paste' },
      { to: '/enroll/print?devUser=enroller', label: 'Print claim cards' }
    ]
  },
  {
    role: 'admin',
    label: 'Platform admin',
    routes: [
      { to: '/admin?devUser=admin', label: 'Admin overview' },
      { to: '/admin/audit?devUser=admin', label: 'Audit log' },
      { to: '/admin/users?devUser=admin', label: 'Users browser' },
      { to: '/admin/orgs?devUser=admin', label: 'Organizations browser' },
      { to: '/admin/seed?devUser=admin', label: 'Demo seeder' }
    ]
  },
  {
    role: 'orgs',
    label: 'Organizations (signed-in)',
    routes: [
      { to: '/orgs?devUser=farmer', label: 'My orgs' },
      { to: '/org/new?devUser=farmer', label: 'Create org' },
      { to: '/settings?devUser=farmer', label: 'Account settings' }
    ]
  }
];

const PUBLIC = [
  { to: '/', label: 'Landing' },
  { to: '/impact', label: 'Impact' },
  { to: '/farmers', label: 'Farmers directory' },
  { to: '/exporters', label: 'Exporters directory' },
  { to: '/organizations', label: 'Partners directory' },
  { to: '/login', label: 'Login' },
  { to: '/register', label: 'Register' },
  { to: '/forgot-password', label: 'Forgot password' }
];

export default function DevIndex() {
  return (
    <div className="space-y-10 page">
      <header className="animate-slide-up">
        <p className="eyebrow">Dev preview</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
          Dashboard previews
        </h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Browse every signed-in surface without registering. Each link injects{' '}
          <code className="font-mono text-koko-teal">?devUser=&lt;role&gt;</code> which the
          AuthContext picks up in dev mode and serves a mock user + profile.
          Production builds disable this entirely.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-koko-warning/40 bg-koko-warningBg px-3 py-2 text-xs text-koko-warning">
          <span>⚠</span> Data is empty — Firestore reads with a fake UID return nothing.
          Layouts, navigation and onboarding all render normally.
        </div>
      </header>

      <section>
        <h2 className="font-display text-2xl text-koko-ink mb-4">Public pages</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PUBLIC.map((r) => (
            <li key={r.to}>
              <Link to={r.to} className="card-hover flex items-center justify-between p-4">
                <span className="text-sm text-koko-ink">{r.label}</span>
                <span className="text-xs text-koko-teal">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {SECTIONS.map((s) => (
        <section key={s.role}>
          <h2 className="font-display text-2xl text-koko-ink mb-4">
            <span className="badge-teal mr-2">{s.label}</span>
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {s.routes.map((r) => (
              <li key={r.to}>
                <Link
                  to={r.to}
                  className="card-hover flex items-center justify-between p-4"
                >
                  <span className="text-sm text-koko-ink">{r.label}</span>
                  <span className="text-xs text-koko-teal">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
