import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import Spinner from '../components/Spinner.jsx';
import { isEmail } from '../utils/validation.js';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      // Firebase returns auth/user-not-found when the email isn't
      // registered. We deliberately don't surface that distinction —
      // safer to look the same either way to avoid email enumeration.
      if (err?.code && err.code !== 'auth/user-not-found') {
        toast.error(err.message || 'Could not send reset email.');
      }
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md page">
      <div className="card-elevated animate-slide-up">
        <div className="text-center">
          <p className="eyebrow">Account recovery</p>
          <h1 className="mt-2 font-display text-3xl text-koko-ink sm:text-4xl">
            Reset your password
          </h1>
          <div className="divider-teal mt-3" />
        </div>

        {sent ? (
          <div className="mt-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-koko-teal100 text-koko-teal animate-bounce-sm">
              <span className="text-2xl">✉</span>
            </div>
            <p className="mt-4 text-sm text-koko-body">
              If an account exists for <span className="font-mono text-koko-ink">{email}</span>,
              we've sent a password reset link. Check your inbox (and spam folder).
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Link to="/login" className="btn-secondary">← Back to sign in</Link>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-4 text-center text-sm text-koko-muted">
              Enter the email you registered with and we'll send a reset link.
            </p>
            <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="fp-email">Email</label>
                <input
                  id="fp-email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`input ${error ? 'input-error' : ''}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                />
                {error && (
                  <p className="error-text" role="alert">
                    <span aria-hidden>!</span> {error}
                  </p>
                )}
              </div>
              <button className="btn-accent w-full" disabled={busy}>
                {busy && <Spinner size="sm" />} {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-koko-muted">
              Remembered it?{' '}
              <Link to="/login" className="font-semibold text-koko-teal hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
