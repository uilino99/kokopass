import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="section">
      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-koko-border bg-white px-6 py-20 text-center shadow-sm sm:py-28 animate-slide-up">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-hero-grad"
          aria-hidden="true"
        />
        <p className="eyebrow">Samoa · Single-origin cacao</p>
        <h1 className="mx-auto mt-5 max-w-3xl font-display text-5xl font-semibold leading-[1.05] text-koko-ink sm:text-7xl">
          The story of every bean,
          <br />
          <span className="italic text-koko-teal">verified.</span>
        </h1>
        <div className="divider-teal mt-8" />
        <p className="mx-auto mt-8 max-w-2xl text-base text-koko-body sm:text-lg">
          KokoPass connects Samoan growers with chocolatiers and buyers worldwide. Every bag
          is QR-traceable to the farm — and the family — that grew it.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/register" className="btn-accent">Start tracing</Link>
          <Link to="/login" className="btn-secondary">Sign in</Link>
        </div>
      </section>

      {/* Pillars */}
      <section>
        <div className="mb-10 text-center">
          <p className="eyebrow">Three-step provenance</p>
          <h2 className="mt-3 font-display text-3xl text-koko-ink sm:text-4xl">From soil to shelf</h2>
          <div className="divider-teal mt-4" />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Pillar n="01" title="Farmer" body="Register your farm, record each harvest, and mint a QR pass that travels with every bag." />
          <Pillar n="02" title="Exporter" body="Aggregate verified batches, generate consolidated shipment QRs, and ship with confidence." />
          <Pillar n="03" title="Buyer" body="Scan a single code to see the farmer's name, photo, location, and quality data." />
        </div>
      </section>

      {/* CTA strip */}
      <section className="overflow-hidden rounded-3xl bg-navy-grad text-white shadow-lg">
        <div className="px-6 py-12 sm:px-12 sm:py-16 text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-koko-teal400">
              For exporters & buyers
            </p>
            <h2 className="mt-3 font-display text-3xl text-white sm:text-4xl">
              Verified provenance, <span className="italic text-koko-teal400">at scale</span>.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-white/80 sm:text-base">
              Tamper-evident traceability with per-bag verification, exporter SaaS, and a buyer
              dashboard for portfolio analytics.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3 sm:mt-0 sm:justify-end">
            <Link to="/register" className="btn-accent">Request access</Link>
            <Link
              to="/login"
              className="btn !bg-white/10 text-white hover:!bg-white/20 border border-white/20"
            >
              Partner sign-in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Pillar({ n, title, body }) {
  return (
    <article className="card-hover">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-3xl text-koko-teal">{n}</span>
        <span className="eyebrow">Step</span>
      </div>
      <h3 className="mt-3 font-display text-2xl text-koko-ink">{title}</h3>
      <p className="mt-2 text-sm text-koko-body">{body}</p>
    </article>
  );
}
