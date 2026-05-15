import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { FullPageSpinner } from './Spinner.jsx';

/**
 * Shared guard for platform-admin pages. Rejects non-admins with a
 * friendly restricted card and a pointer to the manual claim-set
 * procedure documented in functions/README.md.
 *
 * Wraps children so each admin page can just render
 * <AdminGate>...</AdminGate> without re-implementing the check.
 */
export default function AdminGate({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <FullPageSpinner label="Loading" />;

  if (!user) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Sign in required</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">Sign in to continue</h1>
        <Link to="/login" className="btn-secondary mt-5 inline-flex">Go to sign in</Link>
      </div>
    );
  }

  if (profile?.admin !== true) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Restricted</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">Platform admin only</h1>
        <p className="mt-2 text-sm text-koko-body">
          This page is reserved for the KokoPass internal team. If you need access, set{' '}
          <code className="font-mono text-koko-teal">admin: true</code> on your user doc and
          the <code className="font-mono text-koko-teal">admin</code> custom claim on your
          auth account (see <code>functions/README.md</code>).
        </p>
        <Link to="/" className="btn-secondary mt-5 inline-flex">← Home</Link>
      </div>
    );
  }

  return children;
}
