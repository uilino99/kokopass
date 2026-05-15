import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../hooks/useAuth.js';
import { useUserOrgs } from '../hooks/useUserOrgs.js';
import { getOrganization, subscribeOrgMembers } from '../utils/firestore.js';
import { findDistrict, SAMOA_CENTER } from '../utils/samoaDistricts.js';
import { FullPageSpinner } from '../components/Spinner.jsx';

const PIN_ICON = L.divIcon({
  className: 'koko-region-pin',
  html:
    '<span style="display:block;width:18px;height:18px;border-radius:50%;background:#003366;border:3px solid #fff;box-shadow:0 0 0 2px rgba(0,51,102,0.35);"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10]
});

const ROLE_LABEL = {
  admin: 'Admin',
  staff: 'Staff',
  fieldAgent: 'Field agent',
  auditor: 'Auditor'
};

export default function OrgTerritories() {
  const { orgId } = useParams();
  const { user } = useAuth();
  const { orgs } = useUserOrgs();
  const [org, setOrg] = useState(null);
  const [missing, setMissing] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

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
      setLoadingMembers(false);
    });
    return unsub;
  }, [orgId]);

  const myRole = orgs?.[orgId] || null;
  const isAdmin = myRole === 'admin' || user?.uid === org?.ownerUid;

  // Build the regionsMap: { regionName: { centroid?, agents: [{member, role}] } }
  const regionsMap = useMemo(() => {
    const map = new Map();
    const seed = (name) => {
      if (!name) return;
      if (!map.has(name)) {
        map.set(name, {
          name,
          centroid: findDistrict(name),
          agents: []
        });
      }
    };
    // Seed every region the org claims to operate in.
    (org?.regions || []).forEach(seed);
    // Add region rows for any member-assigned region the org didn't list.
    members.forEach((m) => {
      (m.regions || []).forEach((r) => {
        seed(r);
        const row = map.get(r);
        if (row && !row.agents.some((a) => a.uid === m.uid)) {
          row.agents.push({
            uid: m.uid,
            displayName: m.displayName,
            role: m.role
          });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.agents.length - a.agents.length);
  }, [org, members]);

  const mapped = regionsMap.filter((r) => r.centroid);
  const unmapped = regionsMap.filter((r) => !r.centroid);

  if (missing) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Not found</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">Organization not found</h1>
        <Link to="/orgs" className="btn-secondary mt-5 inline-flex">← Your orgs</Link>
      </div>
    );
  }

  if (!org || loadingMembers) return <FullPageSpinner label="Loading territories" />;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl card text-center page">
        <p className="eyebrow !text-koko-error">Admin only</p>
        <h1 className="mt-2 font-display text-3xl text-koko-ink">
          Territory overview is admin-only
        </h1>
        <Link to={`/org/${orgId}`} className="btn-secondary mt-5 inline-flex">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 page">
      <div className="no-print">
        <Link to={`/org/${orgId}`} className="btn-ghost">← {org.name}</Link>
      </div>

      <header className="animate-slide-up">
        <p className="eyebrow">Territories</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-5xl">
          Who covers what
        </h1>
        <div className="divider-teal mt-4 ml-0" />
        <p className="mt-4 text-sm text-koko-body">
          Each pin is one district your organization operates in. Tap a pin to see which
          members cover it, or scroll for the full agent + region breakdown.
        </p>
      </header>

      {/* Map */}
      <section className="card-elevated animate-slide-up">
        <div className="overflow-hidden rounded-2xl border border-koko-border" style={{ height: 420 }}>
          <MapContainer
            center={SAMOA_CENTER}
            zoom={8}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapped.map((r) => (
              <Marker
                key={r.name}
                position={[r.centroid.lat, r.centroid.lng]}
                icon={PIN_ICON}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold text-koko-ink">{r.centroid.label}</div>
                    {r.agents.length === 0 ? (
                      <div className="mt-1 text-koko-muted">No agents assigned yet.</div>
                    ) : (
                      <ul className="mt-1 space-y-0.5">
                        {r.agents.map((a) => (
                          <li key={a.uid} className="text-koko-body">
                            {a.displayName || a.uid.slice(0, 10) + '…'}{' '}
                            <span className="text-koko-muted">· {ROLE_LABEL[a.role] || a.role}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        <p className="helper mt-3">
          {mapped.length} of {regionsMap.length} region
          {regionsMap.length === 1 ? '' : 's'} placed on the map.
          {unmapped.length > 0 &&
            ` ${unmapped.length} custom region${unmapped.length === 1 ? '' : 's'} listed below.`}
        </p>
      </section>

      {/* By region */}
      <section>
        <p className="eyebrow">By region</p>
        <h2 className="mt-1 font-display text-2xl text-koko-ink sm:text-3xl">
          Coverage by district
        </h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-koko-border">
          <table className="min-w-full divide-y divide-koko-border text-sm">
            <thead className="bg-koko-bg/60 text-left text-2xs uppercase tracking-widest text-koko-muted">
              <tr>
                <th className="px-3 py-2">Region</th>
                <th className="px-3 py-2">Agents</th>
                <th className="px-3 py-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-koko-border">
              {regionsMap.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-koko-muted">
                    No regions listed on the org or its members.
                  </td>
                </tr>
              )}
              {regionsMap.map((r) => (
                <tr key={r.name}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-koko-ink">{r.name}</div>
                    {!r.centroid && (
                      <div className="text-2xs text-koko-muted">Custom · not on map</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.agents.length === 0 ? (
                      <span className="text-koko-muted">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {r.agents.map((a) => (
                          <span key={a.uid} className="badge-teal">
                            {a.displayName || a.uid.slice(0, 8) + '…'}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-display text-lg text-koko-ink">
                    {r.agents.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* By agent */}
      <section>
        <p className="eyebrow">By agent</p>
        <h2 className="mt-1 font-display text-2xl text-koko-ink sm:text-3xl">
          Territory per member
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {members.map((m) => (
            <li key={m.id} className="card">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-koko-ink">
                  {m.displayName || m.uid.slice(0, 12) + '…'}
                </span>
                <span className="badge-navy">{ROLE_LABEL[m.role] || m.role}</span>
              </div>
              {m.regions?.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {m.regions.map((r) => (
                    <span key={r} className="badge-teal">{r}</span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-koko-muted">
                  No regions assigned.{' '}
                  <Link to={`/org/${orgId}/members`} className="text-koko-teal hover:underline">
                    Assign →
                  </Link>
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
