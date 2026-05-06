import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="space-y-10">
      <section className="card text-center">
        <p className="badge mx-auto">MVP · Pilot Sprint</p>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          Verified cacao,<br />from Samoa to the world.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-koko-mist/80">
          KokoPass connects farmers, exporters, and buyers with QR-verified traceability —
          so every bag tells the story of the family that grew it.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/register" className="btn-primary">Register a farm</Link>
          <Link to="/login" className="btn-secondary">Sign in</Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="text-3xl">🌱</div>
          <h3 className="mt-2 text-lg font-semibold">Farmer</h3>
          <p className="mt-1 text-sm text-koko-mist/80">
            Register your farm, record each batch, and generate a QR pass for buyers.
          </p>
        </div>
        <div className="card">
          <div className="text-3xl">📦</div>
          <h3 className="mt-2 text-lg font-semibold">Exporter</h3>
          <p className="mt-1 text-sm text-koko-mist/80">
            Aggregate batches, scan QR codes, and ship verified shipments overseas.
          </p>
        </div>
        <div className="card">
          <div className="text-3xl">🛒</div>
          <h3 className="mt-2 text-lg font-semibold">Buyer</h3>
          <p className="mt-1 text-sm text-koko-mist/80">
            Scan a bag and see the farmer's name, photo, location, and quality data.
          </p>
        </div>
      </section>
    </div>
  );
}
