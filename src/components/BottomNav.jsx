import { Link, NavLink } from 'react-router-dom';

const Icon = ({ d }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden="true"
  >
    {d}
  </svg>
);

const ICONS = {
  home: (
    <Icon d={<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>} />
  ),
  leaf: (
    <Icon
      d={
        <>
          <path d="M5 19c4-9 9-12 16-13-1 7-4 12-13 16" />
          <path d="M5 19c0-3 3-6 9-9" />
        </>
      }
    />
  ),
  box: (
    <Icon
      d={
        <>
          <path d="M3 7l9-4 9 4-9 4-9-4z" />
          <path d="M3 7v10l9 4 9-4V7" />
          <path d="M12 11v10" />
        </>
      }
    />
  ),
  qr: (
    <Icon
      d={
        <>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <path d="M14 14h3v3M21 14v7M14 21h3" />
        </>
      }
    />
  ),
  plus: <Icon d={<path d="M12 5v14M5 12h14" />} />,
  exit: (
    <Icon
      d={
        <>
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <path d="M16 17l5-5-5-5M21 12H9" />
        </>
      }
    />
  )
};

export default function BottomNav({ user, profile, onLogout }) {
  if (!user) return null;
  const isExporter = profile?.role === 'exporter';

  const left = [
    { to: '/dashboard', label: 'Home', icon: ICONS.home, end: true },
    isExporter
      ? { to: '/exporter', label: 'Shipments', icon: ICONS.box }
      : { to: '/farm', label: 'Farm', icon: ICONS.leaf }
  ];

  const fab = isExporter
    ? { to: '/exporter/shipments/new', label: 'New shipment' }
    : { to: '/batches/new', label: 'New batch' };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-koko-border bg-white/95 backdrop-blur md:hidden no-print"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className="relative mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2 text-xs">
        {left.map((t) => (
          <Tab key={t.to} {...t} />
        ))}

        {/* Center FAB */}
        <div className="flex justify-center">
          <Link
            to={fab.to}
            aria-label={fab.label}
            className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-koko-teal text-white shadow-lg transition active:scale-95"
          >
            {ICONS.plus}
          </Link>
        </div>

        {/* QR scan shortcut for exporters, otherwise spacer */}
        {isExporter ? (
          <Tab to="/exporter/shipments/new" label="Scan" icon={ICONS.qr} />
        ) : (
          <span aria-hidden />
        )}

        <button
          type="button"
          onClick={onLogout}
          className="flex flex-col items-center gap-1 text-koko-muted transition hover:text-koko-navy"
        >
          {ICONS.exit}
          <span className="text-[10px] font-medium">Sign out</span>
        </button>
      </div>
    </nav>
  );
}

function Tab({ to, label, icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 transition ${
          isActive ? 'text-koko-navy' : 'text-koko-muted hover:text-koko-navy'
        }`
      }
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );
}
