import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useUserOrgs } from '../hooks/useUserOrgs.js';
import { useToast } from '../components/Toast.jsx';
import {
  createAuditVisit,
  deleteAuditVisit,
  getAuditVisit,
  getFarm,
  getOrganization,
  listOrgPrograms,
  updateAuditVisit
} from '../utils/firestore.js';
import LocationPicker from '../components/LocationPicker.jsx';
import PhotoGallery from '../components/PhotoGallery.jsx';
import Spinner, { FullPageSpinner } from '../components/Spinner.jsx';

const RECS = [
  { value: 'pass', label: 'Pass — compliant', tone: 'border-koko-success/40 bg-koko-successBg' },
  { value: 'fail', label: 'Fail — non-compliant', tone: 'border-koko-error/40 bg-koko-errorBg' },
  { value: 'follow-up', label: 'Follow-up needed', tone: 'border-koko-warning/40 bg-koko-warningBg' }
];

export default function OrgVisitEditor({ mode = 'new' }) {
  const { orgId, visitId } = useParams();
  const { user, profile } = useAuth();
  const { orgs } = useUserOrgs();
  const navigate = useNavigate();
  const toast = useToast();

  const isEdit = mode === 'edit';

  const [org, setOrg] = useState(null);
  const [missing, setMissing] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [existingVisit, setExistingVisit] = useState(null);

  const [form, setForm] = useState({
    farmUid: '',
    programId: '',
    visitDate: new Date().toISOString().slice(0, 10),
    location: null,
    findings: '',
    notes: '',
    recommendation: 'pass',
    photoUrls: [],
    status: 'submitted'
  });
  const [farmHint, setFarmHint] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Stable upload bucket id for new visits before they're persisted.
  const uploadId = useMemo(
    () => (isEdit ? visitId : `draft-${Date.now()}`),
    [isEdit, visitId]
  );

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
      try {
        const p = await listOrgPrograms(orgId);
        if (active) setPrograms(p);
      } catch {
        /* ignore */
      }

      if (isEdit && visitId) {
        const v = await getAuditVisit(visitId);
        if (!active) return;
        if (!v) {
          setMissing(true);
          return;
        }
        setExistingVisit(v);
        setForm({
          farmUid: v.farmUid || '',
          programId: v.programId || '',
          visitDate: v.visitDate || new Date().toISOString().slice(0, 10),
          location: v.location || null,
          findings: v.findings || '',
          notes: v.notes || '',
          recommendation: v.recommendation || 'pass',
          photoUrls: v.photoUrls || [],
          status: v.status || 'submitted'
        });
        if (v.farmUid) {
          setFarmHint({ found: true, name: v.farmNameHint || v.farmUid, village: '' });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [orgId, isEdit, visitId]);

  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 5000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  if (missing) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Not found</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">
          {isEdit ? 'Visit not found' : 'Organization not found'}
        </h1>
        <Link to={`/org/${orgId}/visits`} className="btn-secondary mt-5 inline-flex">
          ← Visits
        </Link>
      </div>
    );
  }

  if (!org) return <FullPageSpinner label="Loading" />;

  const myRole = orgs?.[orgId] || null;
  const isAdmin = myRole === 'admin' || user?.uid === org.ownerUid;
  const isAuditor = myRole === 'auditor';
  const canAct = isAdmin || isAuditor;
  const isMineOrAdmin =
    isAdmin || (existingVisit && existingVisit.auditorUid === user?.uid);

  if (!canAct) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Not allowed</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">
          You need auditor or admin access
        </h1>
        <Link to={`/org/${orgId}`} className="btn-secondary mt-5 inline-flex">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  if (isEdit && !isMineOrAdmin) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Not your visit</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">
          Only the auditor who recorded the visit (or an org admin) can edit it
        </h1>
        <Link to={`/org/${orgId}/visits`} className="btn-secondary mt-5 inline-flex">
          ← Visits
        </Link>
      </div>
    );
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const lookupFarm = async () => {
    const uid = form.farmUid.trim();
    if (!uid) return;
    setLookingUp(true);
    try {
      const f = await getFarm(uid);
      setFarmHint(
        f
          ? { found: true, name: f.farmName, village: f.village }
          : { found: false }
      );
    } catch {
      setFarmHint({ found: false });
    } finally {
      setLookingUp(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.farmUid.trim()) {
      toast.error('Enter a farm UID.');
      return;
    }
    setBusy(true);
    try {
      const program = programs.find((p) => p.id === form.programId) || null;
      const payload = {
        orgId,
        orgName: org.name,
        programId: program?.id || null,
        programName: program?.name || '',
        farmUid: form.farmUid.trim(),
        farmNameHint: farmHint?.found ? farmHint.name : '',
        auditorUid: user.uid,
        auditorName: profile?.fullName || '',
        visitDate: form.visitDate,
        location: form.location || null,
        findings: form.findings.trim(),
        notes: form.notes.trim(),
        recommendation: form.recommendation,
        photoUrls: form.photoUrls,
        status: form.status
      };
      if (isEdit && visitId) {
        await updateAuditVisit(visitId, payload);
        toast.success('Visit updated.');
      } else {
        await createAuditVisit(payload);
        toast.success('Visit logged.');
      }
      navigate(`/org/${orgId}/visits`);
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
    setBusy(true);
    try {
      await deleteAuditVisit(visitId);
      toast.success('Visit deleted.');
      navigate(`/org/${orgId}/visits`);
    } catch (err) {
      toast.error(err.message || 'Could not delete.');
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 page">
      <div className="no-print">
        <Link to={`/org/${orgId}/visits`} className="btn-ghost">← Visits</Link>
      </div>

      <header className="animate-slide-up">
        <p className="eyebrow">{isEdit ? 'Editing visit' : 'New audit visit'}</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
          {isEdit
            ? existingVisit?.farmNameHint || 'Visit'
            : 'Log a site visit'}
        </h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Record what you saw on-site. Visits are public-readable — buyers and certifiers
          rely on them as evidence behind every certification.
        </p>
      </header>

      <form onSubmit={save} className="card-elevated space-y-6 animate-slide-up">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="v-farm">Farm UID *</label>
            <div className="flex gap-2">
              <input
                id="v-farm"
                className="input flex-1 font-mono text-sm"
                value={form.farmUid}
                onChange={(e) => {
                  setForm((f) => ({ ...f, farmUid: e.target.value }));
                  setFarmHint(null);
                }}
                placeholder="paste a farm UID…"
                required
              />
              <button
                type="button"
                onClick={lookupFarm}
                disabled={lookingUp || !form.farmUid.trim()}
                className="btn-secondary"
              >
                {lookingUp ? <Spinner size="sm" /> : 'Look up'}
              </button>
            </div>
            {farmHint && (
              <p
                className={`mt-1 text-xs ${
                  farmHint.found ? 'text-koko-success' : 'text-koko-error'
                }`}
              >
                {farmHint.found
                  ? `✓ ${farmHint.name}${farmHint.village ? ` · ${farmHint.village}` : ''}`
                  : '✗ No farm found at that UID.'}
              </p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="v-program">Program (optional)</label>
            <select
              id="v-program"
              className="input"
              value={form.programId}
              onChange={set('programId')}
            >
              <option value="">— not tied to a program —</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="v-date">Visit date *</label>
            <input
              id="v-date"
              type="date"
              className="input"
              value={form.visitDate}
              onChange={set('visitDate')}
              required
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={set('status')}
            >
              <option value="submitted">Submitted</option>
              <option value="draft">Draft (work in progress)</option>
            </select>
          </div>
        </div>

        <fieldset>
          <legend className="label">Recommendation *</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {RECS.map((r) => (
              <label
                key={r.value}
                className={`relative cursor-pointer rounded-xl border p-3 transition ${
                  form.recommendation === r.value
                    ? r.tone + ' shadow-sm'
                    : 'border-koko-border bg-white hover:border-koko-teal/60'
                }`}
              >
                <input
                  type="radio"
                  name="rec"
                  value={r.value}
                  checked={form.recommendation === r.value}
                  onChange={set('recommendation')}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold text-koko-ink">
                  {r.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="v-findings">Findings</label>
          <textarea
            id="v-findings"
            className="input"
            value={form.findings}
            onChange={set('findings')}
            placeholder="What did you observe? Compliance against program criteria…"
          />
        </div>
        <div>
          <label className="label" htmlFor="v-notes">Internal notes</label>
          <textarea
            id="v-notes"
            className="input"
            value={form.notes}
            onChange={set('notes')}
            placeholder="Notes for follow-up, anomalies, conversation context…"
          />
        </div>

        <div>
          <label className="label">GPS location (optional)</label>
          <p className="helper mb-2">
            Tap the map or use device GPS to record where the visit happened.
          </p>
          <LocationPicker
            value={form.location}
            onChange={(loc) => setForm((f) => ({ ...f, location: loc }))}
          />
        </div>

        <div>
          <label className="label">Photos</label>
          <p className="helper mb-2">
            Up to 3 photos from the site visit. Public-readable on the farm page.
          </p>
          <PhotoGallery
            value={form.photoUrls}
            onChange={(urls) => setForm((f) => ({ ...f, photoUrls: urls }))}
            basePath={`organizations/${user.uid}/visits/${uploadId}`}
            max={3}
            label="Add"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link to={`/org/${orgId}/visits`} className="btn-secondary">Cancel</Link>
          <button className="btn-accent" disabled={busy}>
            {busy && <Spinner size="sm" />}{' '}
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Log visit'}
          </button>
        </div>
      </form>

      {isEdit && isMineOrAdmin && (
        <section className="card-elevated animate-slide-up">
          <p className="eyebrow !text-koko-error">Danger zone</p>
          <h2 className="mt-1 font-display text-2xl text-koko-ink">Delete this visit</h2>
          <p className="mt-2 text-sm text-koko-body">
            Removes the audit record. Any certification still in place is unaffected.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className={`btn-danger ${
                confirmDelete
                  ? ''
                  : '!bg-white !text-koko-error border border-koko-error/40 shadow-none'
              }`}
            >
              {busy && <Spinner size="sm" />}{' '}
              {confirmDelete ? 'Click again to confirm' : 'Delete visit'}
            </button>
            {confirmDelete && !busy && (
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
      )}
    </div>
  );
}
