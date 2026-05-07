import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from './Toast.jsx';

export default function Layout({ children }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

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
            <nav className="flex items-center gap-1 sm:gap-2">
              <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
              <NavLink to="/farm" className={linkClass}>Farm</NavLink>
              <Link to="/batches/new" className="btn-accent !min-h-[40px] !px-4 !py-2 hidden sm:inline-flex">
                + Batch
              </Link>
              <button onClick={handleLogout} className="btn-ghost">
                Sign out
              </button>
            </nav>
          ) : (
            <nav className="flex items-center gap-2">
              <Link to="/login" className="btn-ghost">Sign in</Link>
              <Link to="/register" className="btn-accent !min-h-[40px] !px-4 !py-2">Register</Link>
            </nav>
          )}
        </div>
        {profile && (
          <div className="container-app -mt-1 flex items-center gap-2 pb-2 text-xs text-koko-muted">
            <span>Signed in as</span>
            <span className="font-medium text-koko-ink">{profile.fullName}</span>
            <span className="text-koko-faint">·</span>
            <span className="badge-navy capitalize">{profile.role}</span>
          </div>
        )}
      </header>

      <main className="container-app py-8 sm:py-12 page">{children}</main>

      <footer className="border-t border-koko-border bg-white py-8 text-center text-xs text-koko-muted no-print">
        <div className="container-app">
          © {new Date().getFullYear()} KokoPass · Crafted with care from Samoa 🇼🇸
        </div>
      </footer>
    </div>
  );
}
