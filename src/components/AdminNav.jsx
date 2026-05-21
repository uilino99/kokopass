import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/audit', label: 'Audit log' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/orgs', label: 'Organizations' },
  { to: '/admin/seed', label: 'Seed' }
];

export default function AdminNav() {
  return (
    <div className="mb-6 no-print">
      <nav className="flex flex-wrap items-center gap-2 pb-3">
        <span className="badge-error mr-1">Platform admin</span>
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ease-out ${
                isActive
                  ? 'text-white shadow-button'
                  : 'text-koko-body hover:text-koko-navy hover:bg-koko-borderSoft'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? {
                    backgroundImage:
                      'linear-gradient(135deg, #003366 0%, #1A4D80 100%)'
                  }
                : undefined
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="hairline" />
    </div>
  );
}
