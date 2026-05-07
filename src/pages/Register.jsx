import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'farmer'
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    setBusy(true);
    try {
      await register(form);
      navigate(form.role === 'farmer' ? '/farm' : '/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="card-elevated">
        <p className="eyebrow text-center">Join KokoPass</p>
        <h1 className="mt-2 text-center font-display text-3xl sm:text-4xl">
          Create your account
        </h1>
        <div className="divider-gold mt-3" />
        <p className="mt-4 text-center text-sm text-koko-mist/85">
          Start tracing your cacao in minutes.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" required value={form.fullName} onChange={set('fullName')} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input className="input" type="tel" value={form.phone} onChange={set('phone')} placeholder="+685 ..." />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required value={form.password} onChange={set('password')} />
          </div>
          <div>
            <label className="label">I am a…</label>
            <select className="input" value={form.role} onChange={set('role')}>
              <option value="farmer">Farmer</option>
              <option value="exporter">Exporter</option>
              <option value="buyer">Buyer</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-koko-mist/70">
          Already have an account?{' '}
          <Link to="/login" className="text-koko-gold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
