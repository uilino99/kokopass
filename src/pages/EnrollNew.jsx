import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import { createEnrollment } from '../utils/firestore.js';
import LocationPicker from '../components/LocationPicker.jsx';
import Spinner from '../components/Spinner.jsx';

const CROPS = ['Cacao', 'Coconut', 'Banana', 'Taro', 'Other'];
const VARIETIES = ['Trinitario', 'Criollo', 'Forastero', 'Mixed', 'Unknown'];

export default function EnrollNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

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
      await createEnrollment(user.uid, form);
      toast.success(`Enrolled · ${form.fullName}`);
      if (addAnother) {
        setForm({
          fullName: '',
          phone: '',
          email: '',
          village: form.village,    // sticky village
          district: form.district,  // sticky district
          crop: 'Cacao',
          variety: 'Trinitario',
          sizeHectares: '',
          story: '',
          location: null
        });
      } else {
        navigate('/enroll');
      }
    } catch (err) {
      toast.error(err.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 page">
      <header className="animate-slide-up">
        <p className="eyebrow">Pre-enrolment</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">Add a farmer</h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Capture the basics now. The farmer can claim this record later by entering their
          6-character code at sign-up.
        </p>
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
            <input id="district" className="input" value={form.district} onChange={set('district')} />
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
            placeholder="A short note about this farm…"
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
          <button type="button" className="btn-secondary" onClick={() => navigate('/enroll')}>
            Cancel
          </button>
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
      {error && <p className="error-text" role="alert"><span aria-hidden>!</span> {error}</p>}
    </div>
  );
}
