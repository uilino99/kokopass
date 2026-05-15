import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import { getFarm, upsertFarm } from '../utils/firestore.js';
import { validateFarm, hasErrors } from '../utils/validation.js';
import LocationPicker from '../components/LocationPicker.jsx';
import BoundaryPicker from '../components/BoundaryPicker.jsx';
import PhotoUpload from '../components/PhotoUpload.jsx';
import Spinner, { FullPageSpinner } from '../components/Spinner.jsx';

const CROPS = ['Cacao', 'Coconut', 'Banana', 'Taro', 'Other'];
const VARIETIES = ['Trinitario', 'Criollo', 'Forastero', 'Mixed', 'Unknown'];

export default function FarmProfile() {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    farmName: '',
    village: '',
    district: '',
    crop: 'Cacao',
    variety: 'Trinitario',
    sizeHectares: '',
    story: '',
    location: null,
    heroUrl: null,
    boundary: []
  });
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => {
      const data = await getFarm(user.uid);
      if (data) setForm((f) => ({ ...f, ...data }));
      setLoading(false);
    })();
  }, [user.uid]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validateFarm(form);
    setErrors(v);
    if (hasErrors(v)) {
      toast.error(Object.values(v)[0]);
      return;
    }
    setBusy(true);
    try {
      await upsertFarm(user.uid, {
        ...form,
        sizeHectares: Number(form.sizeHectares) || 0
      });
      // Persist avatar onto the user profile too so other pages see it.
      if (avatarUrl !== (profile?.avatarUrl || null)) {
        await updateProfile({ avatarUrl: avatarUrl || null });
      }
      toast.success('Farm saved.');
      setTimeout(() => navigate('/dashboard'), 400);
    } catch (err) {
      toast.error(err.message || 'Could not save farm.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <FullPageSpinner label="Loading your farm" />;

  return (
    <div className="mx-auto max-w-2xl space-y-8 page">
      <header className="animate-slide-up">
        <p className="eyebrow">Your origin</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">Farm profile</h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          This story travels with every QR-verified bag — buyers will see it when they scan.
        </p>
      </header>

      <form onSubmit={onSubmit} noValidate className="card-elevated space-y-6 animate-slide-up">
        <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
          <div>
            <label className="label">Your photo</label>
            <PhotoUpload
              value={avatarUrl}
              onChange={setAvatarUrl}
              path={`users/${user.uid}/avatar`}
              label="Add photo"
              hint="A friendly face builds trust"
              aspect="square"
            />
          </div>
          <div>
            <label className="label">Farm hero photo</label>
            <PhotoUpload
              value={form.heroUrl}
              onChange={(url) => setForm((f) => ({ ...f, heroUrl: url }))}
              path={`farms/${user.uid}/hero`}
              label="Add a wide farm photo"
              hint="Shown to buyers when they scan"
              aspect="landscape"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Farm name" id="farmName" error={errors.farmName} required>
            <input
              id="farmName"
              className={`input ${errors.farmName ? 'input-error' : ''}`}
              value={form.farmName}
              onChange={set('farmName')}
            />
          </Field>
          <Field label="Village" id="village" error={errors.village} required>
            <input
              id="village"
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
          <Field label="Primary crop" id="crop">
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

        <Field label="Your story (shown to buyers)" id="story" hint="A few sentences about your farm and family.">
          <textarea
            id="story"
            className="input"
            value={form.story}
            onChange={set('story')}
            placeholder="Talofa! Our family has grown cacao on the slopes above…"
          />
        </Field>

        <Field label="Farm location" id="location" error={errors.location} required>
          <LocationPicker
            value={form.location}
            onChange={(loc) => {
              setForm((f) => ({ ...f, location: loc }));
              if (errors.location) setErrors((s) => ({ ...s, location: undefined }));
            }}
          />
        </Field>

        <Field
          label="Farm boundary"
          id="boundary"
          hint="Optional. Tap the map to drop boundary corners; drag to refine. Shown on your public farmer page."
        >
          <BoundaryPicker
            value={form.boundary}
            onChange={(pts) => setForm((f) => ({ ...f, boundary: pts }))}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button className="btn-accent" disabled={busy}>
            {busy && <Spinner size="sm" />} {busy ? 'Saving…' : 'Save farm'}
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
