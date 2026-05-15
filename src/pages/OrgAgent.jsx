import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useUserOrgs } from '../hooks/useUserOrgs.js';
import { useOnlineStatus } from '../utils/offline.js';
import {
  getOrganization,
  subscribeEnrollmentsByOrg,
  subscribeOrgMembers
} from '../utils/firestore.js';
import { FullPageSpinner } from '../components/Spinner.jsx';

export default function OrgAgent() {
  const { orgId } = useParams();
  const { user } = useAuth();
  const { orgs } = useUserOrgs();
  const online = useOnlineStatus();
  const [org, setOrg] = useState(null);
  const [missing, setMissing] = useState(false);
  const [myMembership, setMyMembership] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loadingEnrol, setLoadingEnrol] = useState(true);

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

  useEffect(() => {
    const unsub = subscribeEnrollmentsByOrg(orgId, (rows) => {
      setEnrollments(rows);
      setLoadingEnrol(false);
    });
    return unsub;
  }, [orgId]);

  const myRole = orgs?.[orgId] || null;
  const isAdmin = myRole === 'admin' || user?.uid === org?.ownerUid;
  const isFieldAgent = myRole === 'fieldAgent';

  const myEnrollments = useMemo(
    () => enrollments.filter((e) => e.fieldAgentUid === user?.uid),
    [enrollments, user?.uid]
  );
  const totalForOrg = enrollments.length;
  const claimedForOrg = enrollments.filter((e) => e.claimed).length;

  if (missing) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Not found</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">Organization not found</h1>
        <Link to="/orgs" className="btn-secondary mt-5 inline-flex">← Your orgs</Link>
      </div>
    );
  }

  if (!org) return <FullPageSpinner label="Loading workspace" />;

  if (!isAdmin && !isFieldAgent) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Not a field agent</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">
          You don't have field-agent access here
        </h1>
        <p className="mt-2 text-sm text-koko-body">
          Ask an admin of <strong>{org.name}</strong> to invite you with the{' '}
          <span className="badge-navy">fieldAgent</span> role.
        </p>
        <Link to={`/org/${orgId}`} className="btn-secondary mt-5 inline-flex">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const myRegions = myMembership?.regions?.length
    ? myMembership.regions
    : org.regions || [];

  return (
    <div className="mx-auto max-w-4xl space-y-8 page">
      <div className="no-print">
        <Link to={`/org/${orgId}`} className="btn-ghost">← {org.name}</Link>
      </div>

      <header className="animate-slide-up">
        <p className="eyebrow">Field workspace</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
          Talofa, {user?.displayName?.split(' ')[0] || 'agent'}
        </h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          You're working for <strong>{org.name}</strong>. Anything you enrol here is tagged
          to this organization automatically and is visible to its admins.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="My enrolments"
          value={myEnrollments.length}
          sub={`${myEnrollments.filter((e) => e.claimed).length} claimed`}
        />
        <Stat
          label="Org total"
          value={totalForOrg}
          sub={`${claimedForOrg} claimed across team`}
        />
        <Stat
          label="Status"
          value={online ? 'Online' : 'Offline'}
          sub={
            online
              ? 'Writes go out immediately'
              : 'Records will sync when reconnected'
          }
        />
      </div>

      <section className="card-elevated animate-slide-up">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Your territory</p>
            <h2 className="mt-1 font-display text-2xl text-koko-ink">
              Assigned regions
            </h2>
          </div>
          {isAdmin && (
            <Link to={`/org/${orgId}/members`} className="btn-ghost">
              Reassign →
            </Link>
          )}
        </div>
        {myRegions.length === 0 ? (
          <p className="mt-3 text-sm text-koko-muted">
            No regions assigned to you yet. Ask an admin to assign your territory on the
            members page.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {myRegions.map((r) => (
              <span key={r} className="badge-teal">{r}</span>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow">Roster</p>
            <h2 className="mt-1 font-display text-2xl text-koko-ink sm:text-3xl">
              Your recent enrolments
            </h2>
          </div>
          <Link to={`/org/${orgId}/agent/enroll`} className="btn-accent">
            + Enrol farmer
          </Link>
        </div>

        {loadingEnrol && <div className="card text-koko-muted">Loading…</div>}

        {!loadingEnrol && myEnrollments.length === 0 && (
          <div className="card text-center animate-slide-up">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-koko-teal100 text-koko-teal">
              <span className="text-xl">🌱</span>
            </div>
            <p className="eyebrow mt-4">No enrolments yet</p>
            <p className="mt-2 text-koko-body">
              When you enrol a farmer they'll appear here with a claim code.
            </p>
            <div className="mt-5">
              <Link to={`/org/${orgId}/agent/enroll`} className="btn-accent">
                Enrol your first farmer
              </Link>
            </div>
          </div>
        )}

        {!loadingEnrol && myEnrollments.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {myEnrollments.slice(0, 50).map((r, i) => (
              <li
                key={r.id}
                className="animate-slide-up"
                style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}
              >
                {r.claimed ? (
                  <div className="card opacity-80">
                    <RosterContent r={r} />
                  </div>
                ) : (
                  <Link to={`/enroll/${r.id}/edit`} className="card-hover block">
                    <RosterContent r={r} />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RosterContent({ r }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className={r.claimed ? 'badge-success' : 'badge-teal'}>
          {r.claimed ? 'Claimed' : 'Pre-enrolled'}
        </span>
        <span className="font-mono text-2xs uppercase tracking-widest text-koko-faint">
          {r.claimCode}
        </span>
      </div>
      <h3 className="mt-3 font-display text-2xl text-koko-ink">{r.fullName}</h3>
      <p className="mt-1 text-sm text-koko-body">
        {[r.village, r.district].filter(Boolean).join(' · ') || '—'}
      </p>
      <div className="divider !my-4" />
      <div className="flex items-center justify-between text-xs text-koko-muted">
        <span>{r.phone || 'no phone'}</span>
        {r.claimed ? (
          <span className="text-koko-success">Claimed by farmer</span>
        ) : (
          <span className="text-koko-teal">Edit →</span>
        )}
      </div>
    </>
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
