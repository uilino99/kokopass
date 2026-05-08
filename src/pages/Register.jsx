import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import Spinner from '../components/Spinner.jsx';
import { validateRegister, hasErrors } from '../utils/validation.js';

const ROLES = [
  { value: 'farmer', label: 'Farmer', desc: 'I grow cacao' },
  { value: 'exporter', label: 'Exporter', desc: 'I aggregate and ship' },
  { value: 'buyer', label: 'Buyer', desc: 'I source verified beans' },
  { value: 'enroller', label: 'Enroller', desc: 'I sign up villages' }
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'farmer',
    claimCode: ''
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => {
    const val = k === 'claimCode' ? e.target.value.toUpperCase() : e.target.value;
    setForm((f) => ({ ...f, [k]: val }));
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validateRegister(form);
    setErrors(v);
    if (hasErrors(v)) return;
    setBusy(true);
    try {
      const { claimedEnrollmentId } = await register(form);

      if (form.role === 'farmer' && form.claimCode?.trim()) {
        if (claimedEnrollmentId) {
          toast.success('Welcome back. Your farm record was claimed.');
        } else {
          toast.error("We couldn't find an unclaimed record for that code.");
        }
      } else {
        toast.success('Account created. Welcome to KokoPass!');
      }

      // Farmers who claimed go straight to the dashboard since their farm
      // is already pre-populated. Otherwise farmers go to /farm to set up.
      const dest =
        form.role === 'farmer'
          ? claimedEnrollmentId
            ? '/dashboard'
            : '/farm'
          : '/dashboard';
      navigate(dest);
    } catch (err) {
      toast.error(err.message || 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md page">
      <div className="card-elevated animate-slide-up">
        <div className="text-center">
          <p className="eyebrow">Join KokoPass</p>
          <h1 className="mt-2 font-display text-3xl text-koko-ink sm:text-4xl">Create your account</h1>
          <div className="divider-teal mt-3" />
          <p className="mt-4 text-sm text-koko-muted">Start tracing your cacao in minutes.</p>
        </div>
        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
          <Field label="Full name" id="r-name" error={errors.fullName}>
            <input
              id="r-name"
              autoComplete="name"
              className={`input ${errors.fullName ? 'input-error' : ''}`}
              value={form.fullName}
              onChange={set('fullName')}
            />
          </Field>
          <Field label="Email" id="r-email" error={errors.email}>
            <input
              id="r-email"
              type="email"
              autoComplete="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              value={form.email}
              onChange={set('email')}
            />
          </Field>
          <Field label="Phone" id="r-phone" hint="Optional · used for SMS verification" error={errors.phone}>
            <input
              id="r-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+685 …"
              className="input"
              value={form.phone}
              onChange={set('phone')}
            />
          </Field>
          <Field label="Password" id="r-password" hint="At least 6 characters." error={errors.password}>
            <input
              id="r-password"
              type="password"
              autoComplete="new-password"
              className={`input ${errors.password ? 'input-error' : ''}`}
              value={form.password}
              onChange={set('password')}
            />
          </Field>
          <fieldset>
            <legend className="label">I am a…</legend>
            <div className="grid gap-2 grid-cols-2">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`relative cursor-pointer rounded-xl border p-3 transition ${
                    form.role === r.value
                      ? 'border-koko-teal bg-koko-teal100/60 shadow-sm'
                      : 'border-koko-border bg-white hover:border-koko-teal/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={form.role === r.value}
                    onChange={set('role')}
                    className="sr-only"
                  />
                  <span className="block text-sm font-semibold text-koko-ink">{r.label}</span>
                  <span className="block text-xs text-koko-muted">{r.desc}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {form.role === 'farmer' && (
            <Field
              label="Claim code"
              id="r-code"
              hint="Were you pre-enrolled by a village rep? Enter your 6-character code to claim your farm record."
            >
              <input
                id="r-code"
                inputMode="text"
                maxLength={6}
                placeholder="XXXXXX"
                autoComplete="off"
                className="input font-mono uppercase tracking-widest"
                value={form.claimCode}
                onChange={set('claimCode')}
              />
            </Field>
          )}

          <button className="btn-accent w-full" disabled={busy}>
            {busy && <Spinner size="sm" />} {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-koko-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-koko-teal hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, id, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {hint && !error && <p className="helper">{hint}</p>}
      {error && <p className="error-text" role="alert"><span aria-hidden>!</span> {error}</p>}
    </div>
  );
}
