import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useUserOrgs } from '../hooks/useUserOrgs.js';
import { useToast } from '../components/Toast.jsx';
import {
  createEnrollment,
  getOrganization,
  subscribeOrgMembers
} from '../utils/firestore.js';
import LocationPicker from '../components/LocationPicker.jsx';
import Spinner, { FullPageSpinner } from '../components/Spinner.jsx';

const CROPS = ['Cacao', 'Coconut', 'Banana', 'Taro', 'Other'];
const VARIETIES = ['Trinitario', 'Criollo', 'Forastero', 'Mixed', 'Unknown'];

export default function OrgAgentEnroll() {
  const { orgId } = useParams();
  const { user } = useAuth();
  const { orgs } = useUserOrgs();
  const navigate = useNavigate();
  const toast = useToast();

  const [org, setOrg] = useState(null);
  const [missing, setMissing] = useState(false);
  const [myMembership, setMyMembership] = useState(null);

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    village: '',
    district: '',
    crop: 'Cacao',
    variety: 'Trinitario',
    sizeHectares: '',
    story: '',
    location: null
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [addAnother, setAddAnother] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const o = await getOrganization(orgId);
      if (!active) return;
      if (!o) setMissing(true);
      else setOrg(o);
    })();
    return () => {
      active = false;
    };
  }, [orgId]);

  useEffect(() => {
    const unsub = subscribeOrgMembers(orgId, (rows) => {
      const mine = rows.find((m) => m.uid === user?.uid);
      setMyMembership(mine || null);
    });
    return unsub;
  }, [orgId, user?.uid]);

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
  const isFieldAgent = myRole === 'fieldAgent';
  const allowed = isAdmin || isFieldAgent;

  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Not allowed</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">
          You need field-agent or admin access
        </h1>
        <Link to={`/org/${orgId}`} className="btn-secondary mt-5 inline-flex">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2)
      errs.fullName = 'Enter a name.';
    if (!form.village.trim()) errs.village = 'Enter a village.';
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error(Object.values(errs)[0]);
      return;
    }
    setBusy(true);
    try {
      await createEnrollment(user.uid, {
        ...form,
        orgId,
        fieldAgentUid: user.uid
      });
      toast.success(`Enrolled · ${form.fullName}`);
      if (addAnother) {
        setForm({
          fullName: '',
          phone: '',
          email: '',
          village: form.village,
          district: form.district,
          crop: 'Cacao',
          variety: 'Trinitario',
          sizeHectares: '',
          story: '',
          location: null
        });
      } else {
        navigate(`/org/${orgId}/agent`);
      }
    } catch (err) {
      toast.error(err.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const myRegions = myMembership?.regions?.length
    ? myMembership.regions
    : org.regions || [];

  return (
    <div className="mx-auto max-w-2xl space-y-8 page">
      <div className="no-print">
        <Link to={`/org/${orgId}/agent`} className="btn-ghost">← Field workspace</Link>
      </div>

      <header className="animate-slide-up">
        <p className="eyebrow">Field enrolment · {org.name}</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">Enrol a farmer</h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Tagged to <strong>{org.name}</strong> automatically. The farmer can claim this
          record later with the 6-character code.
        </p>
        {myRegions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-xs text-koko-muted">Your territory:</span>
            {myRegions.map((r) => (
              <span key={r} className="badge-teal">{r}</span>
            ))}
          </div>
        )}
      </header>

      <form onSubmit={onSubmit} noValidate className="card-elevated space-y-6 animate-slide-up">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" id="name" required error={errors.fullName}>
            <input
              id="name"
              required
              className={`input ${errors.fullName ? 'input-error' : ''}`}
              value={form.fullName}
              onChange={set('fullName')}
            />
          </Field>
          <Field label="Phone" id="phone" hint="Used for SMS claim later">
            <input
              id="phone"
              type="tel"
              placeholder="+685 …"
              className="input"
              value={form.phone}
              onChange={set('phone')}
            />
          </Field>
          <Field label="Email" id="email" hint="Optional">
            <input
              id="email"
              type="email"
              className="input"
              value={form.email}
              onChange={set('email')}
            />
          </Field>
          <Field label="Village" id="village" required error={errors.village}>
            <input
              id="village"
              required
              className={`input ${errors.village ? 'input-error' : ''}`}
              value={form.village}
              onChange={set('village')}
            />
          </Field>
          <Field label="District" id="district">
            {myRegions.length > 0 ? (
              <select
                id="district"
                className="input"
                value={form.district}
                onChange={set('district')}
              >
                <option value="">— pick a region —</option>
                {myRegions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            ) : (
              <input
                id="district"
                className="input"
                value={form.district}
                onChange={set('district')}
              />
            )}
          </Field>
          <Field label="Size (hectares)" id="size">
            <input
              id="size"
              type="number"
              step="0.1"
              min="0"
              className="input"
              value={form.sizeHectares}
              onChange={set('sizeHectares')}
            />
          </Field>
          <Field label="Crop" id="crop">
            <select id="crop" className="input" value={form.crop} onChange={set('crop')}>
              {CROPS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Variety" id="variety">
            <select id="variety" className="input" value={form.variety} onChange={set('variety')}>
              {VARIETIES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Story (optional)" id="story">
          <textarea
            id="story"
            className="input"
            value={form.story}
            onChange={set('story')}
          />
        </Field>

        <Field label="Location (optional)" id="location">
          <LocationPicker
            value={form.location}
            onChange={(loc) => setForm((f) => ({ ...f, location: loc }))}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-koko-body">
          <input
            type="checkbox"
            checked={addAnother}
            onChange={(e) => setAddAnother(e.target.checked)}
            className="h-4 w-4 rounded border-koko-border text-koko-teal focus:ring-koko-teal"
          />
          Save and add another (keeps village)
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Link to={`/org/${orgId}/agent`} className="btn-secondary">Cancel</Link>
          <button className="btn-accent" disabled={busy}>
            {busy && <Spinner size="sm" />} {busy ? 'Saving…' : 'Save farmer'}
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
