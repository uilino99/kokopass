import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../components/Toast.jsx';
import { bulkCreateEnrollments } from '../utils/firestore.js';
import { csvToRecords, parseCsv } from '../utils/csv.js';
import Spinner from '../components/Spinner.jsx';

const HEADERS = [
  'fullName',
  'phone',
  'email',
  'village',
  'district',
  'crop',
  'variety',
  'sizeHectares',
  'story',
  'lat',
  'lng'
];

const SAMPLE = `fullName,phone,village,district,crop,variety,sizeHectares
Sina Tagaloa,+685 7012345,Lalomanu,Aleipata,Cacao,Trinitario,1.2
Mose Faleu,+685 7045678,Saleapaga,Aleipata,Cacao,Mixed,0.9
Tilo Pita,,Salelologa,Savai'i,Cacao,Trinitario,2.1`;

export default function EnrollBulk() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const { records, errors } = useMemo(() => {
    const errs = [];
    if (!text.trim()) return { records: [], errors: [] };
    const rows = parseCsv(text);
    const recs = csvToRecords(rows, HEADERS);
    const out = recs.map((r, i) => {
      const rec = {
        ...r,
        sizeHectares: r.sizeHectares ? Number(r.sizeHectares) : '',
        location:
          r.lat && r.lng && Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng))
            ? { lat: Number(r.lat), lng: Number(r.lng) }
            : null
      };
      if (!rec.fullName) errs.push({ row: i + 1, msg: 'Missing full name' });
      if (!rec.village) errs.push({ row: i + 1, msg: 'Missing village' });
      return rec;
    });
    return { records: out, errors: errs };
  }, [text]);

  const valid = records.filter((_, i) => !errors.find((e) => e.row === i + 1));

  const onSubmit = async () => {
    if (valid.length === 0) {
      toast.error('Nothing to import.');
      return;
    }
    setBusy(true);
    try {
      const { ok, failed } = await bulkCreateEnrollments(user.uid, valid);
      if (failed > 0) {
        toast.error(`Imported ${ok} of ${ok + failed}. ${failed} failed.`);
      } else {
        toast.success(`Imported ${ok} farmers.`);
      }
      navigate('/enroll');
    } catch (err) {
      toast.error(err.message || 'Bulk import failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 page">
      <header className="animate-slide-up">
        <p className="eyebrow">Bulk enrolment</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">Paste a CSV</h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Paste rows from your field roster. Each row becomes a pre-enrolled farmer with a
          unique claim code.
        </p>
      </header>

      <section className="card-elevated animate-slide-up">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow">Step 1</p>
            <h2 className="mt-1 font-display text-2xl text-koko-ink">Paste your data</h2>
          </div>
          <button
            type="button"
            onClick={() => setText(SAMPLE)}
            className="btn-ghost"
          >
            Load sample
          </button>
        </div>
        <p className="helper mt-2">
          Headers: {HEADERS.join(', ')}. <code className="font-mono">fullName</code> and{' '}
          <code className="font-mono">village</code> are required; the rest are optional. The
          first row may be a header (auto-detected).
        </p>
        <textarea
          className="input mt-3 min-h-[200px] font-mono text-xs"
          placeholder="fullName,phone,village,district,crop,variety,sizeHectares…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </section>

      {records.length > 0 && (
        <section className="card-elevated animate-slide-up">
          <div className="flex items-end justify-between">
            <div>
              <p className="eyebrow">Step 2</p>
              <h2 className="mt-1 font-display text-2xl text-koko-ink">Preview</h2>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="badge-success">{valid.length} valid</span>
              {errors.length > 0 && <span className="badge-error">{errors.length} skipped</span>}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-koko-border">
            <table className="min-w-full divide-y divide-koko-border text-sm">
              <thead className="bg-koko-bg/60 text-left text-2xs uppercase tracking-widest text-koko-muted">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Village</th>
                  <th className="px-3 py-2">District</th>
                  <th className="px-3 py-2">Crop</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-koko-border">
                {records.map((r, i) => {
                  const err = errors.find((e) => e.row === i + 1);
                  return (
                    <tr key={i} className={err ? 'bg-koko-errorBg/40' : ''}>
                      <td className="px-3 py-2 text-koko-faint">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-koko-ink">{r.fullName || '—'}</td>
                      <td className="px-3 py-2">{r.village || '—'}</td>
                      <td className="px-3 py-2">{r.district || '—'}</td>
                      <td className="px-3 py-2">{r.crop || 'Cacao'}</td>
                      <td className="px-3 py-2 text-koko-muted">{r.phone || '—'}</td>
                      <td className="px-3 py-2">
                        {err ? (
                          <span className="badge-error">{err.msg}</span>
                        ) : (
                          <span className="badge-success">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-koko-muted">
              Importing {valid.length} valid row{valid.length === 1 ? '' : 's'}
              {errors.length > 0 ? ` · skipping ${errors.length}` : ''}.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate('/enroll')}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmit}
                className="btn-accent"
                disabled={busy || valid.length === 0}
              >
                {busy && <Spinner size="sm" />}{' '}
                {busy ? 'Importing…' : `Import ${valid.length} farmer${valid.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
