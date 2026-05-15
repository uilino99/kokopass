import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useUserOrgs } from '../hooks/useUserOrgs.js';
import { getOrganization } from '../utils/firestore.js';
import { FullPageSpinner } from '../components/Spinner.jsx';
import { SkeletonCard } from '../components/Skeleton.jsx';

const TYPE_LABEL = {
  government: 'Government',
  ngo: 'NGO',
  cooperative: 'Cooperative',
  certifier: 'Certifier',
  buyer: 'Buyer',
  private: 'Private'
};

export default function Orgs() {
  const { orgs, loading, refresh } = useUserOrgs();
  const [details, setDetails] = useState({}); // { [orgId]: org doc | 'missing' }
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!orgs) return;
    const ids = Object.keys(orgs);
    if (ids.length === 0) {
      setDetails({});
      return;
    }
    let active = true;
    (async () => {
      const results = await Promise.allSettled(ids.map((id) => getOrganization(id)));
      if (!active) return;
      const next = {};
      ids.forEach((id, i) => {
        const r = results[i];
        next[id] = r.status === 'fulfilled' && r.value ? r.value : 'missing';
      });
      setDetails(next);
    })();
    return () => {
      active = false;
    };
  }, [orgs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <FullPageSpinner label="Loading your organizations" />;

  const ids = Object.keys(orgs);

  return (
    <div className="space-y-8 page">
      <header className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end animate-slide-up">
        <div>
          <p className="eyebrow">Memberships</p>
          <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
            Your organizations
          </h1>
          <div className="divider-teal mt-4 ml-0" />
          <p className="mt-4 text-sm text-koko-body">
            Organizations are how government agencies, NGOs, cooperatives and certifiers
            collaborate on the platform. You can belong to as many as you need.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary"
          >
            {refreshing ? 'Refreshing…' : '⟳ Refresh'}
          </button>
          <Link to="/org/new" className="btn-accent">+ New organization</Link>
        </div>
      </header>

      {ids.length === 0 && (
        <div className="card text-center animate-slide-up">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-koko-teal100 text-koko-teal">
            <span className="text-xl">🏛</span>
          </div>
          <p className="eyebrow mt-4">No memberships yet</p>
          <p className="mt-2 text-koko-body">
            Create a new organization, or ask an existing organization to invite you with
            your user UID.
          </p>
          <p className="helper mt-3">
            Your UID is below — copy it and send to the inviting org admin.
          </p>
          <UidPill />
          <div className="mt-5">
            <Link to="/org/new" className="btn-accent">Create new organization</Link>
          </div>
        </div>
      )}

      {ids.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {ids.map((id, i) => {
            const detail = details[id];
            const role = orgs[id];
            return (
              <li
                key={id}
                className="animate-slide-up"
                style={{ animationDelay: `${Math.min(i * 50, 240)}ms` }}
              >
                {detail === undefined ? (
                  <SkeletonCard />
                ) : detail === 'missing' ? (
                  <div className="card opacity-70">
                    <p className="eyebrow !text-koko-error">Unavailable</p>
                    <h3 className="mt-2 font-display text-2xl text-koko-ink">
                      Organization not found
                    </h3>
                    <p className="mt-1 font-mono text-2xs text-koko-faint break-all">
                      {id}
                    </p>
                  </div>
                ) : (
                  <Link to={`/org/${id}`} className="card-hover block">
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-koko-border bg-koko-bg">
                        {detail.logoUrl ? (
                          <img
                            src={detail.logoUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="font-display text-xl text-koko-navy">
                            {(detail.name || '?').slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-2xl text-koko-ink leading-tight">
                          {detail.name}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="badge-navy">{TYPE_LABEL[detail.type] || 'Org'}</span>
                          <span className="badge-teal">Your role: {role}</span>
                        </div>
                      </div>
                    </div>
                    {detail.regions?.length > 0 && (
                      <p className="mt-3 text-xs text-koko-muted">
                        Regions: {detail.regions.join(', ')}
                      </p>
                    )}
                    <div className="divider !my-4" />
                    <div className="flex items-center justify-between text-xs text-koko-muted">
                      <span>{detail.public ? 'Public profile' : 'Private'}</span>
                      <span className="text-koko-teal">Open dashboard →</span>
                    </div>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-koko-muted">
        Memberships sync from a Cloud Function — give it ~10 seconds after creating an org
        or accepting an invite, then hit Refresh.
      </p>
    </div>
  );
}

function UidPill() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-koko-border bg-koko-bg/60 px-3 py-2 text-xs">
      <span className="text-koko-muted">UID</span>
      <span className="font-mono break-all text-koko-ink">{user.uid}</span>
    </div>
  );
}
