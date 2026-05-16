import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useUserOrgs } from '../hooks/useUserOrgs.js';
import { useToast } from '../components/Toast.jsx';
import {
  createProgram,
  deleteProgram,
  getOrganization,
  subscribeOrgPrograms,
  updateProgram
} from '../utils/firestore.js';
import Spinner, { FullPageSpinner } from '../components/Spinner.jsx';

export default function OrgPrograms() {
  const { orgId } = useParams();
  const { user } = useAuth();
  const { orgs } = useUserOrgs();
  const toast = useToast();

  const [org, setOrg] = useState(null);
  const [missing, setMissing] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: '',
    description: '',
    validityMonths: 12,
    active: true
  });
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

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
    const unsub = subscribeOrgPrograms(orgId, (rows) => {
      setPrograms(rows);
      setLoading(false);
    });
    return unsub;
  }, [orgId]);

  const myRole = orgs?.[orgId] || null;
  const isAdmin = myRole === 'admin' || user?.uid === org?.ownerUid;

  if (missing) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Not found</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">Organization not found</h1>
        <Link to="/orgs" className="btn-secondary mt-5 inline-flex">← Your orgs</Link>
      </div>
    );
  }

  if (!org || loading) return <FullPageSpinner label="Loading programs" />;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Admin only</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">
          Programs are managed by org admins
        </h1>
        <Link to={`/org/${orgId}`} className="btn-secondary mt-5 inline-flex">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name || '',
      description: p.description || '',
      validityMonths: p.validityMonths || 12,
      active: p.active ?? true
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', description: '', validityMonths: 12, active: true });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Enter a program name.');
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        await updateProgram(orgId, editingId, {
          name: form.name.trim(),
          description: form.description.trim(),
          validityMonths: Number(form.validityMonths) || 12,
          active: !!form.active
        });
        toast.success('Program updated.');
      } else {
        await createProgram(orgId, {
          name: form.name.trim(),
          description: form.description.trim(),
          validityMonths: Number(form.validityMonths) || 12,
          active: !!form.active
        });
        toast.success('Program created.');
      }
      cancelEdit();
    } catch (err) {
      toast.error(err.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (p) => {
    if (!window.confirm(`Delete program "${p.name}"? Existing certifications stay intact.`)) return;
    try {
      await deleteProgram(orgId, p.id);
      toast.success('Program deleted.');
      if (editingId === p.id) cancelEdit();
    } catch (err) {
      toast.error(err.message || 'Could not delete.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 page">
      <div className="no-print">
        <Link to={`/org/${orgId}`} className="btn-ghost">← {org.name}</Link>
      </div>

      <header className="animate-slide-up">
        <p className="eyebrow">Programs</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
          Certification programs
        </h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Define what your organization certifies. Auditors on your team issue these as
          certifications against individual farms.
        </p>
      </header>

      <form onSubmit={onSubmit} className="card-elevated space-y-4 animate-slide-up">
        <p className="eyebrow">{editingId ? 'Editing program' : 'Add a program'}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" id="p-name" required>
            <input
              id="p-name"
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Fairtrade, Samoa Organic"
            />
          </Field>
          <Field label="Validity (months)" id="p-validity">
            <input
              id="p-validity"
              type="number"
              min="1"
              max="120"
              className="input"
              value={form.validityMonths}
              onChange={(e) => setForm((f) => ({ ...f, validityMonths: e.target.value }))}
            />
          </Field>
        </div>
        <Field label="Description" id="p-desc">
          <textarea
            id="p-desc"
            className="input"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="What does this program certify?"
          />
        </Field>
        <label className="flex items-start gap-2 text-sm text-koko-body">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            className="mt-0.5 h-4 w-4 rounded border-koko-border text-koko-teal focus:ring-koko-teal"
          />
          <span>
            <span className="font-medium text-koko-ink">Active</span>
            <span className="block text-koko-muted">
              Inactive programs stay listed but can't be used for new certifications.
            </span>
          </span>
        </label>
        <div className="flex justify-end gap-2">
          {editingId && (
            <button type="button" className="btn-ghost" onClick={cancelEdit}>Cancel</button>
          )}
          <button className="btn-accent" disabled={busy}>
            {busy && <Spinner size="sm" />}{' '}
            {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add program'}
          </button>
        </div>
      </form>

      <section>
        <h2 className="mb-3 font-display text-2xl text-koko-ink">
          {programs.length} program{programs.length === 1 ? '' : 's'}
        </h2>
        {programs.length === 0 ? (
          <div className="card text-koko-muted text-center">
            No programs yet. Add one above to start issuing certifications.
          </div>
        ) : (
          <ul className="grid gap-3">
            {programs.map((p) => (
              <li key={p.id} className="card">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium text-koko-ink">{p.name}</span>
                      <span className={p.active ? 'badge-success' : 'badge-warning'}>
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-koko-muted">
                        Valid {p.validityMonths || 12} months
                      </span>
                    </div>
                    {p.description && (
                      <p className="mt-1 text-sm text-koko-body">{p.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="btn-ghost !min-h-[32px] !px-3 !py-1 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(p)}
                      className="btn-ghost !min-h-[32px] !px-3 !py-1 text-xs hover:!text-koko-error"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, id, required, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-koko-error">*</span>}
      </label>
      {children}
    </div>
  );
}
