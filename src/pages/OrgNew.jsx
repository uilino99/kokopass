import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useUserOrgs } from '../hooks/useUserOrgs.js';
import { useToast } from '../components/Toast.jsx';
import { createOrganization, ORG_TYPES } from '../utils/firestore.js';
import PhotoUpload from '../components/PhotoUpload.jsx';
import Spinner from '../components/Spinner.jsx';

const TYPE_LABEL = {
  government: 'Government agency',
  ngo: 'NGO',
  cooperative: 'Cooperative',
  certifier: 'Certifier / audit body',
  buyer: 'Buyer / brand',
  private: 'Private / other'
};

export default function OrgNew() {
  const { user, profile } = useAuth();
  const { refresh } = useUserOrgs();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    name: '',
    type: 'private',
    headquarters: '',
    regionsText: '',
    story: '',
    email: '',
    phone: '',
    website: '',
    logoUrl: null,
    public: true
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // Stable per-session upload nonce so PhotoUpload writes to a path that
  // matches the storage rule (`organizations/{uploaderUid}/{token}/...`)
  // before any orgId exists.
  const uploadNonce = useMemo(() => `draft-${Date.now()}`, []);

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: val }));
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      errs.name = 'Enter an organization name.';
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error(Object.values(errs)[0]);
      return;
    }
    setBusy(true);
    try {
      const orgId = await createOrganization(
        user.uid,
        {
          name: form.name.trim(),
          type: form.type,
          regions: form.regionsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          story: form.story.trim(),
          contact: {
            headquarters: form.headquarters.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            website: form.website.trim()
          },
          logoUrl: form.logoUrl || null,
          public: !!form.public
        },
        profile?.fullName || ''
      );
      // Force-refresh the ID token so request.auth.token.orgs reflects
      // the new membership the syncMembershipClaims function is writing
      // right now. Worst case the claim hasn't propagated yet; the org
      // owner can still read their own org (public-read) and is allowed
      // by the rules' bootstrap clause to see their own member doc.
      try {
        await user.getIdToken(true);
        await refresh();
      } catch {
        /* non-fatal */
      }
      toast.success('Organization created.');
      navigate(`/org/${orgId}`);
    } catch (err) {
      toast.error(err.message || 'Could not create organization.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 page">
      <header className="animate-slide-up">
        <p className="eyebrow">New organization</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
          Set up your organization
        </h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          You'll be the first admin. Invite more members from the organization dashboard
          once it's created.
        </p>
      </header>

      <form onSubmit={onSubmit} noValidate className="card-elevated space-y-6 animate-slide-up">
        <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
          <div>
            <label className="label">Logo</label>
            <PhotoUpload
              value={form.logoUrl}
              onChange={(url) => setForm((f) => ({ ...f, logoUrl: url }))}
              path={`organizations/${user.uid}/${uploadNonce}/logo`}
              label="Add logo"
              hint="Square works best"
              aspect="square"
            />
            <p className="helper mt-2">
              You can replace this from the settings page after creating.
            </p>
          </div>
          <div className="space-y-5">
            <Field label="Name" id="org-name" required error={errors.name}>
              <input
                id="org-name"
                className={`input ${errors.name ? 'input-error' : ''}`}
                value={form.name}
                onChange={set('name')}
              />
            </Field>
            <Field label="Type" id="org-type">
              <select id="org-type" className="input" value={form.type} onChange={set('type')}>
                {ORG_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABEL[t] || t}</option>
                ))}
              </select>
            </Field>
            <Field label="Headquarters" id="org-hq" hint="e.g. Apia, Samoa">
              <input
                id="org-hq"
                className="input"
                value={form.headquarters}
                onChange={set('headquarters')}
              />
            </Field>
          </div>
        </div>

        <Field
          label="Regions served"
          id="org-regions"
          hint="Comma-separated, e.g. Aleipata, Savai'i, Upolu"
        >
          <input
            id="org-regions"
            className="input"
            value={form.regionsText}
            onChange={set('regionsText')}
          />
        </Field>

        <Field label="Story" id="org-story" hint="What does your organization do?">
          <textarea
            id="org-story"
            className="input"
            value={form.story}
            onChange={set('story')}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Email" id="org-email">
            <input id="org-email" type="email" className="input" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Phone" id="org-phone">
            <input id="org-phone" type="tel" className="input" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Website" id="org-site">
            <input
              id="org-site"
              type="url"
              placeholder="https://…"
              className="input"
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
            <span className="font-medium text-koko-ink">List my organization publicly</span>
            <span className="block text-koko-muted">
              Uncheck to keep your org private while you set it up.
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Link to="/orgs" className="btn-secondary">Cancel</Link>
          <button className="btn-accent" disabled={busy}>
            {busy && <Spinner size="sm" />} {busy ? 'Creating…' : 'Create organization'}
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
