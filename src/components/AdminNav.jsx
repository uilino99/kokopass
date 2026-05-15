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
    <nav className="flex flex-wrap items-center gap-2 border-b border-koko-border pb-3 mb-6 no-print">
      <span className="badge-error mr-1">Platform admin</span>
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              isActive
                ? 'bg-koko-navy text-white shadow-sm'
                : 'text-koko-body hover:text-koko-navy hover:bg-koko-borderSoft'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
