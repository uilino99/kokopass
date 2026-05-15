import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { subscribeInquiriesForTarget } from '../utils/firestore.js';
import { useToast } from './Toast.jsx';
import BottomNav from './BottomNav.jsx';
import InstallPrompt from './InstallPrompt.jsx';
import OfflineBanner from './OfflineBanner.jsx';

export default function Layout({ children }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [unreadInquiries, setUnreadInquiries] = useState(0);

  // Light-weight inquiry-unread counter for the exporter top nav.
  useEffect(() => {
    if (!user || profile?.role !== 'exporter') {
      setUnreadInquiries(0);
      return;
    }
    const unsub = subscribeInquiriesForTarget(user.uid, (rows) => {
      setUnreadInquiries(rows.filter((r) => (r.status || 'new') === 'new').length);
    });
    return unsub;
  }, [user, profile?.role]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Could not sign out.');
    }
  };

  const linkClass = ({ isActive }) =>
    `relative rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'text-koko-navy'
        : 'text-koko-body hover:text-koko-navy hover:bg-koko-borderSoft'
    }`;

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-koko-border bg-white/85 backdrop-blur-md no-print">
        <div className="container-app flex h-16 items-center justify-between">
          <Link to="/" className="group flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl shadow-sm transition group-hover:shadow-md">
              <img src="/icon.svg" alt="" className="h-9 w-9" />
            </span>
            <span className="font-display text-xl font-semibold text-koko-ink">
              Koko<span className="text-koko-teal">Pass</span>
            </span>
            <span className="badge-teal ml-1 hidden sm:inline-flex">Samoa</span>
          </Link>

          {user ? (
            // Top nav is desktop-only when signed in — bottom nav owns mobile.
            <nav className="hidden items-center gap-1 md:flex md:gap-2">
              <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
              {profile?.role === 'exporter' && (
                <>
                  <NavLink to="/exporter" className={linkClass}>Shipments</NavLink>
                  <NavLink
                    to="/exporter/inquiries"
                    className={({ isActive }) =>
                      `relative rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'text-koko-navy'
                          : 'text-koko-body hover:text-koko-navy hover:bg-koko-borderSoft'
                      }`
                    }
                  >
                    Inbox
                    {unreadInquiries > 0 && (
                      <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-koko-error px-1.5 text-2xs font-semibold text-white">
                        {unreadInquiries}
                      </span>
                    )}
                  </NavLink>
                  <NavLink to="/exporter/profile" className={linkClass}>Profile</NavLink>
                  <Link
                    to="/exporter/shipments/new"
                    className="btn-accent !min-h-[40px] !px-4 !py-2"
                  >
                    + Shipment
                  </Link>
                </>
              )}
              {profile?.role === 'buyer' && (
                <>
                  <NavLink to="/buyer" className={linkClass}>Portfolio</NavLink>
                  <Link
                    to="/buyer/scan"
                    className="btn-accent !min-h-[40px] !px-4 !py-2"
                  >
                    + Scan
                  </Link>
                </>
              )}
              {profile?.role === 'enroller' && (
                <>
                  <NavLink to="/enroll" className={linkClass}>Enrolments</NavLink>
                  <Link
                    to="/enroll/new"
                    className="btn-accent !min-h-[40px] !px-4 !py-2"
                  >
                    + Farmer
                  </Link>
                </>
              )}
              {!['exporter', 'buyer', 'enroller'].includes(profile?.role) && (
                <>
                  <NavLink to="/farm" className={linkClass}>Farm</NavLink>
                  <Link
                    to="/batches/new"
                    className="btn-accent !min-h-[40px] !px-4 !py-2"
                  >
                    + Batch
                  </Link>
                </>
              )}
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `btn-ghost ${isActive ? 'text-koko-navy' : ''}`
                }
                title="Account settings"
              >
                Settings
              </NavLink>
              <button onClick={handleLogout} className="btn-ghost">
                Sign out
              </button>
            </nav>
          ) : (
            <nav className="flex items-center gap-2">
              <NavLink to="/impact" className="btn-ghost hidden md:inline-flex">
                Impact
              </NavLink>
              <NavLink to="/exporters" className="btn-ghost hidden sm:inline-flex">
                Exporters
              </NavLink>
              <Link to="/login" className="btn-ghost">Sign in</Link>
              <Link to="/register" className="btn-accent !min-h-[40px] !px-4 !py-2">Register</Link>
            </nav>
          )}
        </div>
        {profile && (
          <div className="container-app -mt-1 hidden items-center gap-2 pb-2 text-xs text-koko-muted md:flex">
            <span>Signed in as</span>
            <span className="font-medium text-koko-ink">{profile.fullName}</span>
            <span className="text-koko-faint">·</span>
            <span className="badge-navy capitalize">{profile.role}</span>
          </div>
        )}
      </header>

      <OfflineBanner />

      <main
        className="container-app py-8 sm:py-12 page"
        style={{
          paddingBottom: user ? 'calc(6rem + env(safe-area-inset-bottom))' : undefined
        }}
      >
        {children}
      </main>

      <footer className="hidden border-t border-koko-border bg-white py-8 text-center text-xs text-koko-muted md:block no-print">
        <div className="container-app">
          © {new Date().getFullYear()} KokoPass · Crafted with care from Samoa 🇼🇸
        </div>
      </footer>

      <BottomNav user={user} profile={profile} onLogout={handleLogout} />
      <InstallPrompt />
    </div>
  );
}
