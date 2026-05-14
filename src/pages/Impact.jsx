import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchAggregateCounts,
  fetchFarmLocations,
  fetchRegionStats
} from '../utils/firestore.js';
import Seo from '../components/Seo.jsx';
import { Skeleton } from '../components/Skeleton.jsx';
import FarmMap from '../components/FarmMap.jsx';

function useCountUp(target, durationMs = 1100) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    if (target == null) {
      setValue(0);
      return;
    }
    const from = fromRef.current;
    const to = target;
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

export default function Impact() {
  const [counts, setCounts] = useState(null);
  const [regions, setRegions] = useState(null);
  const [pins, setPins] = useState(null);

  useEffect(() => {
    let active = true;
    fetchAggregateCounts()
      .then((c) => {
        if (active) setCounts(c);
      })
      .catch(() => {
        if (active)
          setCounts({
            farms: 0,
            batches: 0,
            shipments: 0,
            exporters: 0,
            enrollments: 0,
            kg: null,
            shippedKg: null
          });
      });
    fetchRegionStats()
      .then((r) => {
        if (active) setRegions(r);
      })
      .catch(() => {
        if (active) setRegions({ rows: [], total: 0, truncated: false });
      });
    fetchFarmLocations()
      .then((p) => {
        if (active) setPins(p);
      })
      .catch(() => {
        if (active) setPins({ pins: [], truncated: false });
      });
    return () => {
      active = false;
    };
  }, []);

  const ready = counts != null;
  const farms = useCountUp(counts?.farms ?? null);
  const enrollments = useCountUp(counts?.enrollments ?? null);
  const batches = useCountUp(counts?.batches ?? null);
  const shipments = useCountUp(counts?.shipments ?? null);
  const exporters = useCountUp(counts?.exporters ?? null);
  const kg = useCountUp(counts?.kg ?? null);

  return (
    <div className="space-y-12 page">
      <Seo
        title="Pilot impact · KokoPass"
        description="Live numbers from the KokoPass cacao traceability pilot across Samoa — farms enrolled, batches verified, shipments traced."
      />

      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-koko-border bg-white px-6 py-20 text-center shadow-sm sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-hero-grad"
          aria-hidden="true"
        />
        <p className="eyebrow">Live pilot impact</p>
        <h1 className="mx-auto mt-5 max-w-3xl font-display text-5xl font-semibold leading-[1.05] text-koko-ink sm:text-7xl">
          The pilot,
          <br />
          <span className="italic text-koko-teal">in numbers.</span>
        </h1>
        <div className="divider-teal mt-8" />
        <p className="mx-auto mt-8 max-w-2xl text-base text-koko-body sm:text-lg">
          KokoPass is rolling out across Samoa with farmers, exporters, and buyers. These
          numbers update in real time as the pilot grows.
        </p>
      </section>

      {/* Big headline numbers */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Headline
          label="Farms participating"
          value={farms}
          ready={ready}
          sub="Single-origin cacao farms with a verified profile."
        />
        <Headline
          label="Pre-enrolled farmers"
          value={enrollments}
          ready={ready}
          sub="Field records waiting to be claimed."
        />
        <Headline
          label="Batches verified"
          value={batches}
          ready={ready}
          sub="Provenance passes minted for individual harvests."
        />
        <Headline
          label="Shipments traced"
          value={shipments}
          ready={ready}
          sub="Consolidated consignments to buyers worldwide."
        />
        <Headline
          label="Verified exporters"
          value={exporters}
          ready={ready}
          sub="Companies publishing public profiles on the directory."
        />
        <Headline
          label="Cacao recorded"
          value={counts?.kg != null ? kg : null}
          ready={ready && counts?.kg != null}
          suffix={counts?.kg != null ? 'kg' : null}
          fallback={counts?.kg == null ? '—' : null}
          sub={
            counts?.kg == null
              ? 'Live kg tracking activates with Cloud Functions deploy.'
              : 'Total verified cacao across the platform.'
          }
        />
      </section>

      {/* Map */}
      <section className="card-elevated animate-slide-up">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Live geography</p>
            <h2 className="mt-1 font-display text-2xl text-koko-ink sm:text-3xl">
              Farms across Samoa
            </h2>
            <p className="mt-1 text-sm text-koko-muted">
              Each pin is a verified KokoPass farm. Tap a pin to view the farmer's profile.
            </p>
          </div>
          {pins && (
            <span className="text-sm text-koko-muted">
              {pins.pins.length} pin{pins.pins.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {!pins ? (
          <Skeleton className="h-[380px] w-full rounded-2xl" />
        ) : pins.pins.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-koko-border bg-koko-bg/60 p-8 text-center text-sm text-koko-muted">
            No farm pins yet. As farmers complete their profile and drop a location, they'll
            appear on the map.
          </div>
        ) : (
          <>
            <FarmMap pins={pins.pins} height={420} />
            {pins.truncated && (
              <p className="helper mt-3">
                Showing the first 500 farms. The full map will switch to a server-maintained
                aggregate as the pilot grows.
              </p>
            )}
          </>
        )}
      </section>

      {/* Per-region breakdown */}
      <section className="card-elevated animate-slide-up">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">By region</p>
            <h2 className="mt-1 font-display text-2xl text-koko-ink sm:text-3xl">
              Farms across Samoa
            </h2>
          </div>
          <span className="text-sm text-koko-muted">
            {regions
              ? `${regions.rows.length} district${regions.rows.length === 1 ? '' : 's'}`
              : ''}
          </span>
        </div>

        {!regions && (
          <div className="mt-5 space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        )}

        {regions && regions.rows.length === 0 && (
          <p className="mt-4 text-sm text-koko-muted">
            No farm profiles yet. As farmers register and pin their location, district counts
            will populate here.
          </p>
        )}

        {regions && regions.rows.length > 0 && (
          <>
            <RegionBars rows={regions.rows} total={regions.total} />
            {regions.truncated && (
              <p className="helper mt-3">
                Showing the first 1,000 farms. A server-maintained aggregate will replace
                this once the pilot grows beyond that.
              </p>
            )}
          </>
        )}
      </section>

      {/* CTA strip */}
      <section className="overflow-hidden rounded-3xl bg-navy-grad text-white shadow-lg">
        <div className="px-6 py-12 sm:px-12 sm:py-16">
          <div className="text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-koko-teal400">
                For government, NGO & impact investors
              </p>
              <h2 className="mt-3 font-display text-3xl text-white sm:text-4xl">
                Want a deeper look?
              </h2>
              <p className="mt-3 max-w-xl text-sm text-white/80 sm:text-base">
                The KokoPass dataset is the most granular record of Samoa's cacao supply
                chain ever assembled. Request a briefing on what the pilot reveals.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3 sm:mt-0 sm:justify-end">
              <Link to="/exporters" className="btn-accent">See exporters</Link>
              <Link
                to="/register"
                className="btn !bg-white/10 text-white hover:!bg-white/20 border border-white/20"
              >
                Become a partner
              </Link>
            </div>
          </div>
        </div>
      </section>

      <p className="text-center text-xs text-koko-muted">
        Numbers refresh on every page load. Have a question?{' '}
        <Link to="/exporters" className="text-koko-teal hover:underline">Browse exporters</Link>.
      </p>
    </div>
  );
}

function RegionBars({ rows, total }) {
  const max = Math.max(...rows.map((r) => r.farms), 1);
  return (
    <ul className="mt-5 space-y-3">
      {rows.map((r, i) => {
        const pct = total > 0 ? Math.round((r.farms / total) * 100) : 0;
        const width = Math.max(2, Math.round((r.farms / max) * 100));
        return (
          <li
            key={r.district}
            className="animate-slide-up"
            style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}
          >
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium text-koko-ink">{r.district}</span>
              <span className="text-koko-muted">
                <span className="font-display text-lg text-koko-ink">{r.farms}</span>{' '}
                farm{r.farms === 1 ? '' : 's'}
                <span className="ml-2 text-2xs text-koko-faint">{pct}%</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-koko-borderSoft">
              <div
                className="h-full rounded-full bg-teal-grad transition-[width] duration-700 ease-out-quint"
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Headline({ label, value, sub, ready, suffix, fallback }) {
  return (
    <div className="card animate-slide-up">
      <p className="eyebrow">{label}</p>
      <div
        className={`mt-3 font-display text-5xl text-koko-ink transition-opacity sm:text-6xl ${
          ready ? 'opacity-100' : 'opacity-40'
        }`}
      >
        {ready
          ? fallback != null
            ? fallback
            : (
                <>
                  {Number(value || 0).toLocaleString()}
                  {suffix && (
                    <span className="ml-1 text-base font-sans font-medium text-koko-muted">
                      {suffix}
                    </span>
                  )}
                </>
              )
          : '—'}
      </div>
      <p className="mt-3 text-sm text-koko-body">{sub}</p>
    </div>
  );
}
