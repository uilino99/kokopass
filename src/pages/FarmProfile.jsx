import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getFarm, upsertFarm } from '../utils/firestore.js';
import { validateFarm, hasErrors } from '../utils/validation.js';
import LocationPicker from '../components/LocationPicker.jsx';

const CROPS = ['Cacao', 'Coconut', 'Banana', 'Taro', 'Other'];
const VARIETIES = ['Trinitario', 'Criollo', 'Forastero', 'Mixed', 'Unknown'];

export default function FarmProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    farmName: '',
    village: '',
    district: '',
    crop: 'Cacao',
    variety: 'Trinitario',
    sizeHectares: '',
    story: '',
    location: null
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const data = await getFarm(user.uid);
      if (data) setForm((f) => ({ ...f, ...data }));
      setLoading(false);
    })();
  }, [user.uid]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = validateFarm(form);
    if (hasErrors(errs)) return setError(Object.values(errs)[0]);
    setBusy(true);
    try {
      await upsertFarm(user.uid, {
        ...form,
        sizeHectares: Number(form.sizeHectares) || 0
      });
      setSaved(true);
      setTimeout(() => navigate('/dashboard'), 700);
    } catch (err) {
      setError(err.message || 'Could not save farm.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-koko-mist/70">Loading farm…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Your farm</h1>
        <p className="text-sm text-koko-mist/80">
          This information shows up on every QR-verified bag.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Farm name</label>
            <input className="input" required value={form.farmName} onChange={set('farmName')} />
          </div>
          <div>
            <label className="label">Village</label>
            <input className="input" required value={form.village} onChange={set('village')} />
          </div>
          <div>
            <label className="label">District</label>
            <input className="input" value={form.district} onChange={set('district')} />
          </div>
          <div>
            <label className="label">Size (hectares)</label>
            <input
              className="input"
              type="number"
              step="0.1"
              min="0"
              value={form.sizeHectares}
              onChange={set('sizeHectares')}
            />
          </div>
          <div>
            <label className="label">Primary crop</label>
            <select className="input" value={form.crop} onChange={set('crop')}>
              {CROPS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Variety</label>
            <select className="input" value={form.variety} onChange={set('variety')}>
              {VARIETIES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Your story (shown to buyers)</label>
          <textarea
            className="input min-h-[100px]"
            value={form.story}
            onChange={set('story')}
            placeholder="A few sentences about your farm and family…"
          />
        </div>

        <div>
          <label className="label">Farm location</label>
          <LocationPicker
            value={form.location}
            onChange={(loc) => setForm((f) => ({ ...f, location: loc }))}
          />
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}
        {saved && <p className="text-sm text-emerald-300">Saved ✔</p>}

        <div className="flex justify-end">
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save farm'}
          </button>
        </div>
      </form>
    </div>
  );
}
