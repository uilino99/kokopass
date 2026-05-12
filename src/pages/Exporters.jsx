import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  countExportsByOwner,
  listPublicExporterProfiles
} from '../utils/firestore.js';
import { SkeletonCard } from '../components/Skeleton.jsx';

export default function Exporters() {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('all');

  useEffect(() => {
    let active = true;
    (async () => {
      const list = await listPublicExporterProfiles();
      if (!active) return;
      setRows(list);
      setLoading(false);
      // Best-effort shipment counts in parallel; missing counts just hide.
      const entries = await Promise.allSettled(
        list.map((r) =>
          countExportsByOwner(r.ownerUid || r.id).then((n) => [r.id, n])
        )
      );
      if (!active) return;
      const next = {};
      entries.forEach((e) => {
        if (e.status === 'fulfilled') next[e.value[0]] = e.value[1];
      });
      setCounts(next);
    })();
    return () => {
      active = false;
    };
  }, []);

  const regions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => (r.regions || []).forEach((reg) => reg && set.add(reg)));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQ =
        !q ||
        [r.companyName, r.contactName, r.headquarters, r.story, ...(r.regions || [])]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q));
      const matchesR = region === 'all' || (r.regions || []).includes(region);
      return matchesQ && matchesR;
    });
  }, [rows, query, region]);

  return (
    <div className="page space-y-10">
      <header className="text-center animate-slide-up">
        <p className="eyebrow">Verified exporters</p>
        <h1 className="mt-2 font-display text-4xl text-koko-ink sm:text-6xl">
          Samoan cacao exporters,
          <br />
          <span className="italic text-koko-teal">trusted partners.</span>
        </h1>
        <div className="divider-teal mt-6" />
        <p className="mx-auto mt-6 max-w-2xl text-koko-body">
          Browse exporters using KokoPass to ship single-origin Samoan cacao with verified
          provenance. Every shipment they create has a public QR pass.
        </p>
      </header>

      <section className="card animate-slide-up">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            className="input flex-1"
            placeholder="Search company, region, or contact…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="input sm:!w-56"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="all">All regions ({rows.length})</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r} ({rows.filter((row) => (row.regions || []).includes(r)).length})
              </option>
            ))}
          </select>
        </div>
        {!loading && (
          <p className="helper mt-2">
            {filtered.length} of {rows.length} exporter{rows.length === 1 ? '' : 's'} shown
          </p>
        )}
      </section>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="card text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-koko-teal100 text-koko-teal">
            <span className="text-xl">📦</span>
          </div>
          <p className="eyebrow mt-4">No public exporters yet</p>
          <p className="mt-2 text-koko-body">
            Exporters on KokoPass can publish their company profile here. Be the first.
          </p>
          <div className="mt-5">
            <Link to="/register" className="btn-accent">Register as an exporter</Link>
          </div>
        </div>
      )}

      {!loading && rows.length > 0 && filtered.length === 0 && (
        <div className="card text-center text-koko-muted">No exporters match those filters.</div>
      )}

      {filtered.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r, i) => (
            <li
              key={r.id}
              className="animate-slide-up"
              style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}
            >
              <ExporterCard profile={r} shipmentCount={counts[r.id]} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExporterCard({ profile, shipmentCount }) {
  const initial = (profile.companyName || '?').slice(0, 1).toUpperCase();
  return (
    <article className="card-hover h-full">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-koko-border bg-koko-bg">
          {profile.logoUrl ? (
            <img src={profile.logoUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="font-display text-2xl text-koko-navy">{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-2xl text-koko-ink leading-tight">
            {profile.companyName}
          </h3>
          {profile.headquarters && (
            <p className="text-sm text-koko-muted">{profile.headquarters}</p>
          )}
        </div>
      </div>

      {profile.story && (
        <p className="mt-3 line-clamp-4 text-sm text-koko-body">{profile.story}</p>
      )}

      {profile.regions?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {profile.regions.slice(0, 4).map((reg) => (
            <span key={reg} className="badge-teal">{reg}</span>
          ))}
          {profile.regions.length > 4 && (
            <span className="badge-navy">+{profile.regions.length - 4}</span>
          )}
        </div>
      )}

      <div className="divider !my-4" />

      <div className="flex items-end justify-between text-xs text-koko-muted">
        <div>
          {Number.isFinite(shipmentCount) ? (
            <>
              <div className="font-display text-2xl text-koko-ink">{shipmentCount}</div>
              <div>shipment{shipmentCount === 1 ? '' : 's'} on KokoPass</div>
            </>
          ) : (
            <span className="text-koko-faint">—</span>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {profile.email && (
            <a
              href={`mailto:${profile.email}`}
              className="btn-ghost !min-h-[32px] !px-2 !py-1 text-xs"
            >
              ✉ Email
            </a>
          )}
          {profile.phone && (
            <a
              href={`tel:${profile.phone}`}
              className="btn-ghost !min-h-[32px] !px-2 !py-1 text-xs"
            >
              ☎ Call
            </a>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost !min-h-[32px] !px-2 !py-1 text-xs"
            >
              ↗ Site
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
