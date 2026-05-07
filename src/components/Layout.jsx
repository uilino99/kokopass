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
    <div className="min-h-full bg-gradient-to-b from-koko-deep via-koko-navy to-koko-deep">
      <header className="border-b border-koko-mist/10 bg-koko-deep/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <span className="text-lg font-bold text-white">KokoPass</span>
            <span className="badge ml-2 hidden sm:inline-flex">Samoa Cacao</span>
          </Link>
          {user ? (
            <nav className="flex items-center gap-1 sm:gap-3 text-sm">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `btn-ghost ${isActive ? 'text-white' : ''}`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/farm"
                className={({ isActive }) =>
                  `btn-ghost ${isActive ? 'text-white' : ''}`
                }
              >
                Farm
              </NavLink>
              <NavLink
                to="/batches/new"
                className={({ isActive }) =>
                  `btn-ghost ${isActive ? 'text-white' : ''}`
                }
              >
                New Batch
              </NavLink>
              <button onClick={handleLogout} className="btn-ghost">
                Sign out
              </button>
            </nav>
          ) : (
            <nav className="flex items-center gap-2 text-sm">
              <Link to="/login" className="btn-ghost">Sign in</Link>
              <Link to="/register" className="btn-primary !py-2 !px-4">Register</Link>
            </nav>
          )}
        </div>
        {profile && (
          <div className="mx-auto max-w-5xl px-4 pb-2 text-xs text-koko-mist/70">
            Signed in as <span className="text-white">{profile.fullName}</span>
            <span className="mx-2">·</span>
            <span className="capitalize text-koko-accent">{profile.role}</span>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">{children}</main>
      <footer className="border-t border-koko-mist/10 py-6 text-center text-xs text-koko-mist/50">
        © {new Date().getFullYear()} KokoPass · Talofa from Samoa 🇼🇸
      </footer>
    </div>
  );
}
