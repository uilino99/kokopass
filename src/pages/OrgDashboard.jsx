import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useUserOrgs } from '../hooks/useUserOrgs.js';
import {
  getOrganization,
  subscribeCertsByOrg,
  subscribeOrgMembers,
  subscribeOrgPrograms
} from '../utils/firestore.js';
import { FullPageSpinner } from '../components/Spinner.jsx';

const TYPE_LABEL = {
  government: 'Government',
  ngo: 'NGO',
  cooperative: 'Cooperative',
  certifier: 'Certifier',
  buyer: 'Buyer',
  private: 'Private'
};

export default function OrgDashboard() {
  const { orgId } = useParams();
  const { user } = useAuth();
  const { orgs } = useUserOrgs();
  const [org, setOrg] = useState(null);
  const [missing, setMissing] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [certs, setCerts] = useState([]);

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
    // Membership doc reads require admin/self/platform-admin. Wrap the
    // subscribe in a try-style guard: rule rejections surface as errors
    // on the snapshot listener.
    const unsub = subscribeOrgMembers(
      orgId,
      (rows) => {
        setMembers(rows);
        setMembersLoading(false);
      }
    );
    // Firestore's onSnapshot can also fire an error callback; the
    // current helper doesn't expose one, so we infer failure via a
    // timeout if no data arrives. Cheap and works for the MVP case.
    const t = setTimeout(() => {
      setMembersLoading((cur) => {
        if (cur) setMembersError(true);
        return false;
      });
    }, 5000);
    return () => {
      clearTimeout(t);
      unsub();
    };
  }, [orgId]);

  useEffect(() => {
    const unsubP = subscribeOrgPrograms(orgId, setPrograms);
    const unsubC = subscribeCertsByOrg(orgId, setCerts);
    return () => {
      unsubP();
      unsubC();
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
  const adminCount = members.filter((m) => m.role === 'admin').length;
  const initial = (org.name || '?').slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto max-w-4xl space-y-8 page">
      <div className="no-print">
        <Link to="/orgs" className="btn-ghost">← Your orgs</Link>
      </div>

      {/* Header */}
      <header className="card-elevated animate-slide-up">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-koko-border bg-koko-bg sm:h-20 sm:w-20">
            {org.logoUrl ? (
              <img src={org.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-3xl text-koko-navy">{initial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{TYPE_LABEL[org.type] || 'Organization'}</p>
            <h1 className="mt-1 font-display text-3xl text-koko-ink sm:text-5xl">
              {org.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              {myRole && (
                <span className="badge-teal">Your role: {myRole}</span>
              )}
              <span className={org.public ? 'badge-success' : 'badge-navy'}>
                {org.public ? 'Public profile' : 'Private'}
              </span>
              {org.contact?.headquarters && (
                <span className="badge-navy">{org.contact.headquarters}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(isAdmin || myRole === 'fieldAgent') && (
              <Link to={`/org/${orgId}/agent`} className="btn-accent">
                Field workspace
              </Link>
            )}
            {(isAdmin || myRole === 'auditor') && (
              <Link to={`/org/${orgId}/certifications`} className="btn-secondary">
                Certifications
              </Link>
            )}
            {(isAdmin || myRole === 'auditor') && (
              <Link to={`/org/${orgId}/visits`} className="btn-secondary">
                Audit visits
              </Link>
            )}
            {isAdmin && (
              <Link to={`/org/${orgId}/programs`} className="btn-secondary">
                Programs
              </Link>
            )}
            {isAdmin && (
              <Link to={`/org/${orgId}/territories`} className="btn-secondary">
                Territories
              </Link>
            )}
            {isAdmin && (
              <Link to={`/org/${orgId}/settings`} className="btn-secondary">Edit</Link>
            )}
          </div>
        </div>
        {org.story && (
          <p className="mt-5 text-sm text-koko-body">{org.story}</p>
        )}
        {org.regions?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {org.regions.map((r) => (
              <span key={r} className="badge-teal">{r}</span>
            ))}
          </div>
        )}
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Members"
          value={membersLoading ? '—' : members.length}
          sub={`${adminCount} admin${adminCount === 1 ? '' : 's'}`}
        />
        <Stat
          label="Regions"
          value={org.regions?.length || 0}
          sub={org.regions?.length ? 'Served by this org' : 'No regions set'}
        />
        <Stat
          label="Programs"
          value={programs.length}
          sub={`${programs.filter((p) => p.active).length} active`}
        />
        <Stat
          label="Certifications"
          value={certs.length}
          sub={`${certs.filter((c) => (c.status || 'verified') === 'verified').length} verified`}
        />
      </div>

      {/* Members preview */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow">Team</p>
            <h2 className="mt-1 font-display text-2xl text-koko-ink sm:text-3xl">Members</h2>
          </div>
          {isAdmin && (
            <Link to={`/org/${orgId}/members`} className="btn-ghost">Manage →</Link>
          )}
        </div>

        {membersError && (
          <div className="card border-koko-warning/30 bg-koko-warningBg/50 text-sm text-koko-body">
            We couldn't load the member list. New orgs sometimes need ~10 seconds for the
            membership sync to propagate — try refreshing the page.
          </div>
        )}

        {membersLoading && !membersError && (
          <div className="card text-koko-muted">Loading members…</div>
        )}

        {!membersLoading && !membersError && members.length === 0 && (
          <div className="card text-koko-muted">No members yet.</div>
        )}

        {!membersLoading && !membersError && members.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {members.slice(0, 6).map((m) => (
              <li key={m.id} className="card">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium text-koko-ink">
                    {m.displayName || m.uid.slice(0, 12) + '…'}
                  </span>
                  <span className="badge-navy">{m.role}</span>
                </div>
                <p className="mt-2 font-mono text-2xs text-koko-faint break-all">
                  {m.uid}
                </p>
                {m.regions?.length > 0 && (
                  <p className="mt-2 text-xs text-koko-muted">
                    Regions: {m.regions.join(', ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="card animate-slide-up">
      <p className="eyebrow">{label}</p>
      <div className="mt-2 font-display text-3xl text-koko-ink sm:text-4xl">{value}</div>
      {sub && <p className="mt-1 text-xs text-koko-muted">{sub}</p>}
    </div>
  );
}
