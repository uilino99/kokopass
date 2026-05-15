import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useUserOrgs } from '../hooks/useUserOrgs.js';
import { useToast } from '../components/Toast.jsx';
import {
  getOrganization,
  ORG_TYPES,
  updateOrganization
} from '../utils/firestore.js';
import PhotoUpload from '../components/PhotoUpload.jsx';
import Spinner, { FullPageSpinner } from '../components/Spinner.jsx';

const TYPE_LABEL = {
  government: 'Government agency',
  ngo: 'NGO',
  cooperative: 'Cooperative',
  certifier: 'Certifier / audit body',
  buyer: 'Buyer / brand',
  private: 'Private / other'
};

export default function OrgSettings() {
  const { orgId } = useParams();
  const { user } = useAuth();
  const { orgs } = useUserOrgs();
  const navigate = useNavigate();
  const toast = useToast();

  const [org, setOrg] = useState(null);
  const [missing, setMissing] = useState(false);
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const o = await getOrganization(orgId);
      if (!active) return;
      if (!o) {
        setMissing(true);
        return;
      }
      setOrg(o);
      setForm({
        name: o.name || '',
        type: o.type || 'private',
        headquarters: o.contact?.headquarters || '',
        regionsText: (o.regions || []).join(', '),
        story: o.story || '',
        email: o.contact?.email || '',
        phone: o.contact?.phone || '',
        website: o.contact?.website || '',
        logoUrl: o.logoUrl || null,
        public: o.public ?? true
      });
    })();
    return () => {
      active = false;
    };
  }, [orgId]);

  if (missing) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Not found</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">Organization not found</h1>
        <Link to="/orgs" className="btn-secondary mt-5 inline-flex">← Your orgs</Link>
      </div>
    );
  }

  if (!org) return <FullPageSpinner label="Loading organization" />;

  const myRole = orgs?.[orgId] || null;
  const isAdmin = myRole === 'admin' || user?.uid === org.ownerUid;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Admin only</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">
          Settings are managed by org admins
        </h1>
        <Link to={`/org/${orgId}`} className="btn-secondary mt-5 inline-flex">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: val }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Enter an organization name.');
      return;
    }
    setBusy(true);
    try {
      await updateOrganization(orgId, {
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
      });
      toast.success('Organization saved.');
      navigate(`/org/${orgId}`);
    } catch (err) {
      toast.error(err.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 page">
      <div className="no-print">
        <Link to={`/org/${orgId}`} className="btn-ghost">← {org.name}</Link>
      </div>

      <header className="animate-slide-up">
        <p className="eyebrow">Settings</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
          Organization settings
        </h1>
        <div className="divider-teal mt-4 ml-0" />
      </header>

      <form onSubmit={onSubmit} noValidate className="card-elevated space-y-6 animate-slide-up">
        <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
          <div>
            <label className="label">Logo</label>
            <PhotoUpload
              value={form.logoUrl}
              onChange={(url) => setForm((f) => ({ ...f, logoUrl: url }))}
              path={`organizations/${user.uid}/${orgId}/logo`}
              label="Add logo"
              hint="Square works best"
              aspect="square"
            />
          </div>
          <div className="space-y-5">
            <Field label="Name" id="s-name" required>
              <input id="s-name" className="input" value={form.name} onChange={set('name')} />
            </Field>
            <Field label="Type" id="s-type">
              <select id="s-type" className="input" value={form.type} onChange={set('type')}>
                {ORG_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABEL[t] || t}</option>
                ))}
              </select>
            </Field>
            <Field label="Headquarters" id="s-hq">
              <input
                id="s-hq"
                className="input"
                value={form.headquarters}
                onChange={set('headquarters')}
              />
            </Field>
          </div>
        </div>

        <Field
          label="Regions served"
          id="s-regions"
          hint="Comma-separated, e.g. Aleipata, Savai'i"
        >
          <input
            id="s-regions"
            className="input"
            value={form.regionsText}
            onChange={set('regionsText')}
          />
        </Field>

        <Field label="Story" id="s-story">
          <textarea
            id="s-story"
            className="input"
            value={form.story}
            onChange={set('story')}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Email" id="s-email">
            <input id="s-email" type="email" className="input" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Phone" id="s-phone">
            <input id="s-phone" type="tel" className="input" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Website" id="s-site">
            <input
              id="s-site"
              type="url"
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
            <span className="block text-koko-muted">Uncheck to hide from the future directory.</span>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Link to={`/org/${orgId}`} className="btn-secondary">Cancel</Link>
          <button className="btn-accent" disabled={busy}>
            {busy && <Spinner size="sm" />} {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, id, hint, required, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-koko-error">*</span>}
      </label>
      {children}
      {hint && <p className="helper">{hint}</p>}
    </div>
  );
}
