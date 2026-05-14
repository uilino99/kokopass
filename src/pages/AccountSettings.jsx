import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import PhotoUpload from '../components/PhotoUpload.jsx';
import Spinner, { FullPageSpinner } from '../components/Spinner.jsx';

export default function AccountSettings() {
  const { user, profile, loading, updateProfile, logout, resetPassword } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    avatarUrl: null
  });
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName || '',
      phone: profile.phone || '',
      avatarUrl: profile.avatarUrl || null
    });
  }, [profile]);

  if (loading || !profile) return <FullPageSpinner label="Loading settings" />;

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      errs.fullName = 'Enter your full name.';
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error(Object.values(errs)[0]);
      return;
    }
    setBusy(true);
    try {
      await updateProfile({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        avatarUrl: form.avatarUrl || null
      });
      toast.success('Settings saved.');
    } catch (err) {
      toast.error(err.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Could not sign out.');
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setResetting(true);
    try {
      await resetPassword(user.email);
      toast.success(`Password reset link sent to ${user.email}.`);
    } catch (err) {
      toast.error(err.message || 'Could not send reset email.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 page">
      <header className="animate-slide-up">
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">Settings</h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Update how you appear across KokoPass and manage your sign-in.
        </p>
      </header>

      <form onSubmit={onSubmit} noValidate className="card-elevated space-y-6 animate-slide-up">
        <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
          <div>
            <label className="label">Photo</label>
            <PhotoUpload
              value={form.avatarUrl}
              onChange={(url) => setForm((f) => ({ ...f, avatarUrl: url }))}
              path={`users/${user.uid}/avatar`}
              label="Add photo"
              hint="Square works best"
              aspect="square"
            />
          </div>
          <div className="space-y-5">
            <Field label="Full name" id="set-name" required error={errors.fullName}>
              <input
                id="set-name"
                autoComplete="name"
                className={`input ${errors.fullName ? 'input-error' : ''}`}
                value={form.fullName}
                onChange={set('fullName')}
              />
            </Field>
            <Field label="Phone" id="set-phone" hint="Used for SMS verification later">
              <input
                id="set-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+685 …"
                className="input"
                value={form.phone}
                onChange={set('phone')}
              />
            </Field>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <ReadOnly label="Email" value={user.email} mono />
          <ReadOnly label="Role" value={<span className="badge-navy capitalize">{profile.role}</span>} />
          <ReadOnly
            label="Member since"
            value={
              profile.createdAt?.toDate
                ? profile.createdAt.toDate().toLocaleDateString()
                : '—'
            }
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link to="/dashboard" className="btn-secondary">Cancel</Link>
          <button className="btn-accent" disabled={busy}>
            {busy && <Spinner size="sm" />} {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <section className="card-elevated animate-slide-up">
        <p className="eyebrow">Sign-in</p>
        <h2 className="mt-1 font-display text-2xl text-koko-ink">Password &amp; session</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={resetting}
            className="btn-secondary justify-start"
          >
            {resetting && <Spinner size="sm" />}
            <span className="ml-2 text-left">
              <span className="block font-semibold text-koko-ink">Send password reset</span>
              <span className="block text-xs font-normal text-koko-muted">
                We'll email a fresh reset link to {user.email}.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="btn-secondary justify-start"
          >
            <span className="text-left">
              <span className="block font-semibold text-koko-ink">Sign out</span>
              <span className="block text-xs font-normal text-koko-muted">
                Ends this session on this device.
              </span>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({ label, id, hint, error, required, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-koko-error">*</span>}
      </label>
      {children}
      {hint && !error && <p className="helper">{hint}</p>}
      {error && (
        <p className="error-text" role="alert">
          <span aria-hidden>!</span> {error}
        </p>
      )}
    </div>
  );
}

function ReadOnly({ label, value, mono }) {
  return (
    <div className="rounded-xl border border-koko-border bg-koko-bg/60 p-3">
      <div className="text-2xs uppercase tracking-widest text-koko-muted">{label}</div>
      <div className={`mt-1 text-koko-ink ${mono ? 'font-mono break-all' : ''}`}>{value}</div>
    </div>
  );
}
