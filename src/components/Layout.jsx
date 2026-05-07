import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function Layout({ children }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-koko-mist/10 bg-koko-ink/80 backdrop-blur-md no-print">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-koko-gold/40 bg-koko-noir shadow-inset">
              <img src="/icon.svg" alt="" className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-semibold tracking-wide text-white">
              Koko<span className="text-koko-gold">Pass</span>
            </span>
            <span className="badge ml-2 hidden sm:inline-flex">Samoa · Single-origin</span>
          </Link>

          {user ? (
            <nav className="flex items-center gap-1 sm:gap-2 text-sm">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `btn-ghost ${isActive ? 'text-koko-gold' : ''}`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/farm"
                className={({ isActive }) =>
                  `btn-ghost ${isActive ? 'text-koko-gold' : ''}`
                }
              >
                Farm
              </NavLink>
              <Link to="/batches/new" className="btn-primary !px-4 !py-2 hidden sm:inline-flex">
                + Batch
              </Link>
              <button onClick={handleLogout} className="btn-ghost">
                Sign out
              </button>
            </nav>
          ) : (
            <nav className="flex items-center gap-2 text-sm">
              <Link to="/login" className="btn-ghost">Sign in</Link>
              <Link to="/register" className="btn-primary !px-4 !py-2">Register</Link>
            </nav>
          )}
        </div>
        <div className="rule-gold" />
        {profile && (
          <div className="mx-auto max-w-6xl px-5 py-2 text-xs text-koko-mist/70">
            <span className="text-koko-mist/60">Signed in as</span>{' '}
            <span className="text-white">{profile.fullName}</span>
            <span className="mx-2 text-koko-mist/30">·</span>
            <span className="capitalize text-koko-gold">{profile.role}</span>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-12">{children}</main>

      <footer className="border-t border-koko-mist/10 py-8 text-center text-xs text-koko-mist/50 no-print">
        <div className="mx-auto max-w-6xl px-5">
          <div className="rule-gold mx-auto mb-4 max-w-xs" />
          © {new Date().getFullYear()} KokoPass · Crafted with care from Samoa 🇼🇸
        </div>
      </footer>
    </div>
  );
}
