import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="space-y-16 sm:space-y-24">
      <section className="relative isolate overflow-hidden rounded-3xl border border-koko-mist/10 bg-koko-noir/70 px-6 py-20 text-center shadow-koko sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-60"
             style={{
               background:
                 'radial-gradient(60% 50% at 50% 0%, rgba(212,166,74,0.12), transparent 70%), radial-gradient(50% 60% at 50% 100%, rgba(91,58,26,0.35), transparent 70%)'
             }} />
        <p className="eyebrow">Samoa · Single-origin cacao</p>
        <h1 className="mx-auto mt-5 max-w-3xl font-display text-5xl font-semibold leading-[1.05] sm:text-7xl">
          The story of every bean,
          <br />
          <span className="italic text-koko-gold">verified.</span>
        </h1>
        <div className="divider-gold mt-8" />
        <p className="mx-auto mt-8 max-w-2xl text-base text-koko-mist sm:text-lg">
          KokoPass connects Samoan growers with discerning chocolatiers and buyers
          worldwide. Every bag is QR-traceable to the farm — and the family — that grew it.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/register" className="btn-primary">Start tracing</Link>
          <Link to="/login" className="btn-secondary">Sign in</Link>
        </div>
      </section>

      <section>
        <div className="mb-10 text-center">
          <p className="eyebrow">Three-step provenance</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">From soil to shelf</h2>
          <div className="divider-gold mt-4" />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Pillar
            n="01"
            title="Farmer"
            body="Register your farm, record each harvest, and mint a QR pass that travels with every bag."
          />
          <Pillar
            n="02"
            title="Exporter"
            body="Aggregate verified batches, generate consolidated shipment QRs, and ship with confidence."
          />
          <Pillar
            n="03"
            title="Buyer"
            body="Scan a single code to see the farmer's name, photo, location, and quality data."
          />
        </div>
      </section>

      <section className="card-elevated text-center">
        <p className="eyebrow">For exporters & buyers</p>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl">
          Verified provenance, <span className="italic text-koko-gold">at scale</span>.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-koko-mist">
          Tamper-evident traceability with a per-bag verification fee, exporter SaaS, and a
          buyer dashboard for portfolio analytics. Pilot opens this quarter.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/register" className="btn-primary">Request access</Link>
          <Link to="/login" className="btn-secondary">Partner sign-in</Link>
        </div>
      </section>
    </div>
  );
}

function Pillar({ n, title, body }) {
  return (
    <div className="card-elevated">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-3xl text-koko-gold">{n}</span>
        <span className="eyebrow">Step</span>
      </div>
      <h3 className="mt-3 font-display text-2xl">{title}</h3>
      <p className="mt-2 text-sm text-koko-mist/90">{body}</p>
    </div>
  );
}
