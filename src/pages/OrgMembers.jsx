import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useUserOrgs } from '../hooks/useUserOrgs.js';
import { useToast } from '../components/Toast.jsx';
import {
  getOrganization,
  ORG_MEMBER_ROLES,
  removeOrgMember,
  subscribeOrgMembers,
  upsertOrgMember
} from '../utils/firestore.js';
import Spinner, { FullPageSpinner } from '../components/Spinner.jsx';

const ROLE_LABEL = {
  admin: 'Admin',
  staff: 'Staff',
  fieldAgent: 'Field agent',
  auditor: 'Auditor'
};

const ROLE_DESC = {
  admin: 'Full control: manage members, settings, programs.',
  staff: 'Read-write within the org. No member management.',
  fieldAgent: 'Mobile workflows: enrol farmers, capture GPS, sync offline.',
  auditor: 'Read-only access for audit + compliance reviews.'
};

export default function OrgMembers() {
  const { orgId } = useParams();
  const { user } = useAuth();
  const { orgs } = useUserOrgs();
  const navigate = useNavigate();
  const toast = useToast();

  const [org, setOrg] = useState(null);
  const [missing, setMissing] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null); // memberUid being confirmed

  const [form, setForm] = useState({
    uid: '',
    displayName: '',
    role: 'staff',
    regionsText: ''
  });

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
      setMembers(rows);
      setMembersLoading(false);
    });
    return unsub;
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
          Members are managed by org admins
        </h1>
        <p className="mt-2 text-sm text-koko-body">
          Ask an admin of <strong>{org.name}</strong> to make changes.
        </p>
        <Link to={`/org/${orgId}`} className="btn-secondary mt-5 inline-flex">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onAdd = async (e) => {
    e.preventDefault();
    const uid = form.uid.trim();
    if (!uid) {
      toast.error('Paste the UID of the person to invite.');
      return;
    }
    if (members.some((m) => m.uid === uid)) {
      toast.error('That person is already a member.');
      return;
    }
    setBusy(true);
    try {
      await upsertOrgMember(orgId, uid, {
        role: form.role,
        displayName: form.displayName.trim(),
        regions: form.regionsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        invitedBy: user.uid
      });
      toast.success(`Added ${form.displayName.trim() || uid.slice(0, 8) + '…'}.`);
      setForm({ uid: '', displayName: '', role: 'staff', regionsText: '' });
    } catch (err) {
      toast.error(err.message || 'Could not add member.');
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (m, nextRole) => {
    try {
      await upsertOrgMember(orgId, m.uid, {
        role: nextRole,
        displayName: m.displayName || '',
        regions: m.regions || [],
        invitedBy: m.invitedBy || user.uid,
        joinedAt: m.joinedAt
      });
      toast.success(`${m.displayName || m.uid.slice(0, 8)} is now ${ROLE_LABEL[nextRole]}.`);
    } catch (err) {
      toast.error(err.message || 'Could not update role.');
    }
  };

  const remove = async (m) => {
    if (confirmRemove !== m.uid) {
      setConfirmRemove(m.uid);
      setTimeout(() => setConfirmRemove((cur) => (cur === m.uid ? null : cur)), 4000);
      return;
    }
    try {
      await removeOrgMember(orgId, m.uid);
      toast.success('Member removed.');
      setConfirmRemove(null);
    } catch (err) {
      toast.error(err.message || 'Could not remove member.');
    }
  };

  const adminCount = members.filter((m) => m.role === 'admin').length;

  return (
    <div className="mx-auto max-w-3xl space-y-8 page">
      <div className="no-print">
        <Link to={`/org/${orgId}`} className="btn-ghost">← {org.name}</Link>
      </div>

      <header className="animate-slide-up">
        <p className="eyebrow">Team</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">Members</h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Invite by UID (for now — email invites land in a future commit). Ask the person
          to send you their UID from <em>Your organizations</em>.
        </p>
      </header>

      {/* Add form */}
      <form onSubmit={onAdd} className="card-elevated space-y-4 animate-slide-up">
        <p className="eyebrow">Add a member</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="User UID" id="m-uid" required hint="Paste the user's UID exactly.">
            <input
              id="m-uid"
              className="input font-mono text-sm"
              value={form.uid}
              onChange={set('uid')}
              placeholder="abc123def456…"
            />
          </Field>
          <Field label="Display name" id="m-name" hint="Hint shown in the team list.">
            <input
              id="m-name"
              className="input"
              value={form.displayName}
              onChange={set('displayName')}
              placeholder="e.g. Maria Tunoa"
            />
          </Field>
          <Field label="Role" id="m-role">
            <select id="m-role" className="input" value={form.role} onChange={set('role')}>
              {ORG_MEMBER_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
            <p className="helper">{ROLE_DESC[form.role]}</p>
          </Field>
          <Field label="Regions" id="m-regions" hint="Comma-separated (optional).">
            <input
              id="m-regions"
              className="input"
              value={form.regionsText}
              onChange={set('regionsText')}
              placeholder="Aleipata, Savai'i"
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <button className="btn-accent" disabled={busy}>
            {busy && <Spinner size="sm" />} {busy ? 'Adding…' : 'Add member'}
          </button>
        </div>
      </form>

      {/* Member list */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-2xl text-koko-ink">
            {membersLoading ? 'Loading…' : `${members.length} member${members.length === 1 ? '' : 's'}`}
          </h2>
          <span className="text-xs text-koko-muted">
            {adminCount} admin{adminCount === 1 ? '' : 's'}
          </span>
        </div>

        {membersLoading && (
          <div className="card text-koko-muted">Loading…</div>
        )}

        {!membersLoading && members.length > 0 && (
          <ul className="grid gap-3">
            {members.map((m) => {
              const isMe = m.uid === user?.uid;
              const isLastAdmin = m.role === 'admin' && adminCount === 1;
              const confirming = confirmRemove === m.uid;
              return (
                <li key={m.id} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-medium text-koko-ink">
                          {m.displayName || m.uid.slice(0, 12) + '…'}
                        </span>
                        {isMe && <span className="badge-teal">You</span>}
                      </div>
                      <p className="mt-1 font-mono text-2xs text-koko-faint break-all">
                        {m.uid}
                      </p>
                      {m.regions?.length > 0 && (
                        <p className="mt-1 text-xs text-koko-muted">
                          Regions: {m.regions.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m, e.target.value)}
                        disabled={isLastAdmin && m.role === 'admin'}
                        className="input !min-h-[36px] !py-1 !text-xs !w-auto"
                        aria-label={`Role for ${m.displayName || m.uid}`}
                      >
                        {ORG_MEMBER_ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => remove(m)}
                        disabled={isLastAdmin}
                        title={isLastAdmin ? 'Can\'t remove the last admin' : 'Remove member'}
                        className={`btn-ghost !min-h-[36px] !px-3 !py-1 text-xs ${
                          confirming ? '!text-koko-error font-semibold' : 'hover:!text-koko-error'
                        }`}
                      >
                        {confirming ? 'Click again' : 'Remove'}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
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
