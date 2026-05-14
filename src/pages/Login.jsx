import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import Spinner from '../components/Spinner.jsx';
import { isEmail } from '../utils/validation.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const validate = () => {
    const e = {};
    if (!isEmail(email)) e.email = 'Enter a valid email address.';
    if (!password) e.password = 'Enter your password.';
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      await login(email, password);
      toast.success('Welcome back.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Sign in failed. Check your email and password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md page">
      <div className="card-elevated animate-slide-up">
        <div className="text-center">
          <p className="eyebrow">Welcome back</p>
          <h1 className="mt-2 font-display text-3xl text-koko-ink sm:text-4xl">Sign in</h1>
          <div className="divider-teal mt-3" />
        </div>
        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
          <Field label="Email" id="login-email" error={errors.email}>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              className={`input ${errors.email ? 'input-error' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
            />
          </Field>
          <div>
            <Field label="Password" id="login-password" error={errors.password}>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                className={`input ${errors.password ? 'input-error' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
              />
            </Field>
            <div className="mt-1 text-right">
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-koko-teal hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>
          <button className="btn-accent w-full" disabled={busy}>
            {busy && <Spinner size="sm" />} {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-koko-muted">
          New to KokoPass?{' '}
          <Link to="/register" className="font-semibold text-koko-teal hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, id, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {error && <p className="error-text" role="alert"><span aria-hidden>!</span> {error}</p>}
    </div>
  );
}
