import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import {
  getExporterProfile,
  upsertExporterProfile
} from '../utils/firestore.js';
import PhotoUpload from '../components/PhotoUpload.jsx';
import Spinner, { FullPageSpinner } from '../components/Spinner.jsx';

export default function ExporterProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    headquarters: '',
    regionsText: '',
    story: '',
    email: '',
    phone: '',
    website: '',
    logoUrl: null,
    public: true
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => {
      const p = await getExporterProfile(user.uid);
      if (p) {
        setForm((f) => ({
          ...f,
          companyName: p.companyName || '',
          contactName: p.contactName || '',
          headquarters: p.headquarters || '',
          regionsText: (p.regions || []).join(', '),
          story: p.story || '',
          email: p.email || '',
          phone: p.phone || '',
          website: p.website || '',
          logoUrl: p.logoUrl || null,
          public: p.public ?? true
        }));
      }
      setLoading(false);
    })();
  }, [user.uid]);

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: val }));
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.companyName.trim()) errs.companyName = 'Enter a company name.';
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error(Object.values(errs)[0]);
      return;
    }
    setBusy(true);
    try {
      await upsertExporterProfile(user.uid, {
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        headquarters: form.headquarters.trim(),
        regions: form.regionsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        story: form.story.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        website: form.website.trim(),
        logoUrl: form.logoUrl || null,
        public: !!form.public
      });
      toast.success('Profile saved.');
      setTimeout(() => navigate('/exporter'), 400);
    } catch (err) {
      toast.error(err.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <FullPageSpinner label="Loading profile" />;

  return (
    <div className="mx-auto max-w-2xl space-y-8 page">
      <header className="animate-slide-up">
        <p className="eyebrow">Public profile</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">Company profile</h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          When public, your company appears on the <strong>/exporters</strong> directory so
          farmers, buyers, and government partners can find you.
        </p>
      </header>

      <form onSubmit={onSubmit} noValidate className="card-elevated space-y-6 animate-slide-up">
        <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
          <div>
            <label className="label">Logo</label>
            <PhotoUpload
              value={form.logoUrl}
              onChange={(url) => setForm((f) => ({ ...f, logoUrl: url }))}
              path={`exporters/${user.uid}/logo`}
              label="Add logo"
              hint="Square works best"
              aspect="square"
            />
          </div>
          <div className="space-y-5">
            <Field label="Company name" id="company" required error={errors.companyName}>
              <input
                id="company"
                className={`input ${errors.companyName ? 'input-error' : ''}`}
                value={form.companyName}
                onChange={set('companyName')}
              />
            </Field>
            <Field label="Contact name" id="contactName">
              <input
                id="contactName"
                className="input"
                value={form.contactName}
                onChange={set('contactName')}
              />
            </Field>
            <Field label="Headquarters" id="hq" hint="e.g. Apia, Samoa">
              <input
                id="hq"
                className="input"
                value={form.headquarters}
                onChange={set('headquarters')}
              />
            </Field>
          </div>
        </div>

        <Field
          label="Regions served"
          id="regions"
          hint="Comma-separated list, e.g. Aleipata, Savai'i, Upolu"
        >
          <input
            id="regions"
            className="input"
            value={form.regionsText}
            onChange={set('regionsText')}
            placeholder="Aleipata, Savai'i"
          />
        </Field>

        <Field label="Story" id="story" hint="What does your company stand for?">
          <textarea
            id="story"
            className="input"
            value={form.story}
            onChange={set('story')}
            placeholder="A short paragraph farmers and buyers will read…"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Email" id="email">
            <input id="email" type="email" className="input" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Phone" id="phone">
            <input id="phone" type="tel" className="input" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Website" id="website">
            <input
              id="website"
              type="url"
              className="input"
              placeholder="https://…"
              value={form.website}
              onChange={set('website')}
            />
          </Field>
        </div>

        <label className="flex items-start gap-2 text-sm text-koko-body">
          <input
            type="checkbox"
            checked={form.public}
            onChange={set('public')}
            className="mt-0.5 h-4 w-4 rounded border-koko-border text-koko-teal focus:ring-koko-teal"
          />
          <span>
            <span className="font-medium text-koko-ink">List my company publicly</span>
            <span className="block text-koko-muted">
              Uncheck to keep your profile private while you set it up.
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={() => navigate('/exporter')}>
            Cancel
          </button>
          <button className="btn-accent" disabled={busy}>
            {busy && <Spinner size="sm" />} {busy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
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
