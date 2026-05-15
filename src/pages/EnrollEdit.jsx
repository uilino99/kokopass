import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import {
  deleteEnrollment,
  getEnrollment,
  updateEnrollment
} from '../utils/firestore.js';
import LocationPicker from '../components/LocationPicker.jsx';
import BoundaryPicker from '../components/BoundaryPicker.jsx';
import Spinner, { FullPageSpinner } from '../components/Spinner.jsx';

const CROPS = ['Cacao', 'Coconut', 'Banana', 'Taro', 'Other'];
const VARIETIES = ['Trinitario', 'Criollo', 'Forastero', 'Mixed', 'Unknown'];

export default function EnrollEdit() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [record, setRecord] = useState(null);
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
    location: null,
    boundary: []
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await getEnrollment(id);
        if (!active) return;
        setRecord(r);
        if (r) {
          setForm({
            fullName: r.fullName || '',
            phone: r.phone || '',
            email: r.email || '',
            village: r.village || '',
            district: r.district || '',
            crop: r.crop || 'Cacao',
            variety: r.variety || 'Trinitario',
            sizeHectares: r.sizeHectares ?? '',
            story: r.story || '',
            location: r.location || null,
            boundary: Array.isArray(r.boundary) ? r.boundary : []
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 5000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  if (loading) return <FullPageSpinner label="Loading enrolment" />;

  if (!record) {
    return (
      <div className="mx-auto max-w-xl card text-center">
        <p className="eyebrow !text-koko-error">Not found</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">Enrolment not found</h1>
        <Link to="/enroll" className="btn-secondary mt-5 inline-flex">← Back</Link>
      </div>
    );
  }

  if (record.enrollerUid !== user.uid) {
    return (
      <div className="mx-auto max-w-xl card text-center">
        <p className="eyebrow !text-koko-error">Not allowed</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">
          You didn't add this record
        </h1>
        <p className="mt-2 text-sm text-koko-body">
          Only the enroller who created a record can edit it.
        </p>
        <Link to="/enroll" className="btn-secondary mt-5 inline-flex">← Back to roster</Link>
      </div>
    );
  }

  if (record.claimed) {
    return (
      <div className="mx-auto max-w-xl card text-center">
        <p className="eyebrow !text-koko-success">Claimed</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">
          {record.fullName} has claimed this record
        </h1>
        <p className="mt-2 text-sm text-koko-body">
          Once a farmer signs up with a claim code, the record becomes theirs to manage on
          their own farm profile.
        </p>
        <Link to="/enroll" className="btn-secondary mt-5 inline-flex">← Back to roster</Link>
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
      await updateEnrollment(id, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        village: form.village.trim(),
        district: form.district.trim(),
        crop: form.crop,
        variety: form.variety,
        sizeHectares: Number(form.sizeHectares) || 0,
        story: form.story.trim(),
        location: form.location || null,
        boundary: Array.isArray(form.boundary) ? form.boundary : []
      });
      toast.success('Enrolment updated.');
      navigate('/enroll');
    } catch (err) {
      toast.error(err.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteEnrollment(id);
      toast.success('Enrolment deleted.');
      navigate('/enroll');
    } catch (err) {
      toast.error(err.message || 'Could not delete.');
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 page">
      <header className="animate-slide-up">
        <p className="eyebrow">Editing enrolment</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
          {record.fullName}
        </h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Claim code{' '}
          <span className="font-mono uppercase tracking-widest text-koko-teal">
            {record.claimCode}
          </span>{' '}
          stays the same — if you've already printed a card, it still works.
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
          <Field label="Phone" id="phone">
            <input id="phone" type="tel" className="input" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Email" id="email">
            <input id="email" type="email" className="input" value={form.email} onChange={set('email')} />
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

        <Field label="Story" id="story" hint="Optional">
          <textarea id="story" className="input" value={form.story} onChange={set('story')} />
        </Field>

        <Field label="Location" id="location" hint="Optional">
          <LocationPicker
            value={form.location}
            onChange={(loc) => setForm((f) => ({ ...f, location: loc }))}
          />
        </Field>

        <Field label="Boundary" id="boundary" hint="Optional. Tap the map to drop perimeter corners.">
          <BoundaryPicker
            value={form.boundary}
            onChange={(pts) => setForm((f) => ({ ...f, boundary: pts }))}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Link to="/enroll" className="btn-secondary">Cancel</Link>
          <button className="btn-accent" disabled={busy}>
            {busy && <Spinner size="sm" />} {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <section className="card-elevated animate-slide-up">
        <p className="eyebrow !text-koko-error">Danger zone</p>
        <h2 className="mt-1 font-display text-2xl text-koko-ink">Delete this enrolment</h2>
        <p className="mt-2 text-sm text-koko-body">
          Removes the record and invalidates the claim code{' '}
          <span className="font-mono uppercase tracking-widest text-koko-teal">
            {record.claimCode}
          </span>
          . If you've already printed and handed out the card, the farmer won't be able to
          claim it any more.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className={`btn-danger ${
              confirmDelete
                ? ''
                : '!bg-white !text-koko-error border border-koko-error/40 shadow-none'
            }`}
          >
            {deleting && <Spinner size="sm" />}{' '}
            {deleting
              ? 'Deleting…'
              : confirmDelete
                ? 'Click again to confirm'
                : 'Delete enrolment'}
          </button>
          {confirmDelete && !deleting && (
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="btn-ghost"
            >
              Never mind
            </button>
          )}
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
