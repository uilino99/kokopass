import {
  createEnrollment,
  createExport,
  newBatchId,
  setBatch,
  upsertExporterProfile,
  recordScan,
  getBatch,
  getExport
} from './firestore.js';

const NAMES = [
  'Sina Tagaloa', 'Mose Faleu', 'Tilo Pita', 'Lupe Ah Sue',
  'Tofu Aulava', 'Iosefa Lima', "Vaitea Su'a", 'Manaia Pou',
  'Sose Faleolo', 'Tasi Tofilau', 'Pati Vai', 'Lemoe Aiono'
];
const VILLAGES = [
  { v: 'Lalomanu', d: 'Aleipata' },
  { v: 'Saleapaga', d: 'Aleipata' },
  { v: "Salelologa", d: "Savai'i" },
  { v: 'Apia', d: 'Tuamasaga' },
  { v: 'Manono', d: 'Aiga-i-le-Tai' },
  { v: 'Fagamalo', d: "Savai'i" },
  { v: 'Lefaga', d: 'Lefaga' }
];
const VARIETIES = ['Trinitario', 'Criollo', 'Forastero', 'Mixed'];
const PROCESSING = ['Wet beans', 'Fermented', 'Dried', 'Roasted'];
const QUALITY = ['A', 'A', 'A', 'B', 'B', 'C'];
const STORIES = [
  'Our family has grown cacao on these slopes for three generations.',
  'After the cyclone we replanted with Trinitario seedlings from the co-op — every pod feels like a gift.',
  'We dry our beans on raised mats facing the trade winds. The flavour comes from the sea air.',
  "My grandfather planted these trees. I'm the third generation to harvest them."
];
const DESTINATIONS = [
  { city: 'Tokyo, Japan', buyer: 'Bean & Bar Co.' },
  { city: 'Auckland, New Zealand', buyer: 'Whittaker Origin' },
  { city: 'San Francisco, USA', buyer: 'Dandelion Sourcing' },
  { city: 'Paris, France', buyer: 'Pralus Origine' }
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const round1 = (n) => Math.round(n * 10) / 10;
const recentDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

// ---------- Per-role seeders ----------

export async function seedEnrollments(enrollerUid, n = 5) {
  let ok = 0;
  for (let i = 0; i < n; i += 1) {
    const v = pick(VILLAGES);
    try {
      await createEnrollment(enrollerUid, {
        fullName: pick(NAMES),
        phone: `+685 ${70_000_00 + Math.floor(Math.random() * 9_999_99)}`,
        email: '',
        village: v.v,
        district: v.d,
        crop: 'Cacao',
        variety: pick(VARIETIES),
        sizeHectares: round1(0.5 + Math.random() * 3),
        story: pick(STORIES),
        location: null
      });
      ok += 1;
    } catch {
      /* ignore individual failures */
    }
  }
  return ok;
}

export async function seedFarmerBatches(ownerUid, profile, farm, n = 3) {
  const ids = [];
  for (let i = 0; i < n; i += 1) {
    const batchId = newBatchId();
    try {
      await setBatch(batchId, {
        ownerUid,
        farmId: ownerUid,
        farmName: farm?.farmName || 'KokoPass Demo Farm',
        village: farm?.village || pick(VILLAGES).v,
        district: farm?.district || pick(VILLAGES).d,
        crop: 'Cacao',
        variety: farm?.variety || pick(VARIETIES),
        location: farm?.location || null,
        farmerName: profile?.fullName || 'Demo farmer',
        farmerAvatarUrl: profile?.avatarUrl || null,
        farmHeroUrl: farm?.heroUrl || null,
        farmStory: farm?.story || pick(STORIES),
        harvestDate: recentDate(Math.floor(Math.random() * 60)),
        weightKg: round1(20 + Math.random() * 80),
        quality: pick(QUALITY),
        processing: pick(PROCESSING),
        moisturePct: round1(6 + Math.random() * 3),
        notes: '',
        photoUrls: []
      });
      ids.push(batchId);
    } catch {
      /* ignore */
    }
  }
  return ids;
}

export async function seedExporterShipment(ownerUid, options = {}) {
  // Build a stand-alone shipment using fabricated batch IDs. We DON'T
  // need the batches to exist for the shipment to be valid for a demo —
  // it shows correctly on /exporter and per-shipment view; only the
  // manifest list will be empty. For a richer demo, the exporter should
  // scan real farmer QRs.
  const batchIds = [
    newBatchId(),
    newBatchId(),
    newBatchId()
  ];
  const dest = pick(DESTINATIONS);
  const totalKg = round1(50 + Math.random() * 200);
  const id = await createExport({
    ownerUid,
    destination: options.destination || dest.city,
    buyerName: options.buyer || dest.buyer,
    vessel: `MV Pacific Star · BK${Math.floor(1000 + Math.random() * 9000)}`,
    departureDate: recentDate(Math.floor(Math.random() * 30)),
    notes: 'Seeded demo shipment.',
    batchIds,
    totalKg,
    farmsCount: batchIds.length,
    status: 'shipped'
  });
  return id;
}

export async function seedExporterProfile(ownerUid, profile = {}) {
  await upsertExporterProfile(ownerUid, {
    companyName: profile.companyName || 'Talofa Origin Co.',
    contactName: profile.contactName || 'Demo Contact',
    logoUrl: null,
    headquarters: 'Apia, Samoa',
    regions: ['Aleipata', "Savai'i", 'Upolu'],
    story:
      'Talofa Origin sources single-origin Samoan cacao from small-holder cooperatives across Aleipata and Savai\'i, with full traceability from harvest to shipment.',
    email: 'aloha@example.com',
    phone: '+685 70 000 00',
    website: 'https://example.com',
    public: true
  });
}

export async function seedBuyerScans(ownerUid, n = 5) {
  // Best-effort: try to record scans against real batches/shipments we
  // can find, falling back to fabricated summaries. We don't know which
  // IDs exist, so we synthesize scan records the dashboard can display
  // without crashing on missing refs (the recent-scans tiles render
  // entirely from the summary).
  let ok = 0;
  for (let i = 0; i < n; i += 1) {
    const isShip = Math.random() < 0.3;
    const fakeId = newBatchId(); // any random ID works as a scan key
    const summary = isShip
      ? {
          destination: pick(DESTINATIONS).city,
          buyerName: pick(DESTINATIONS).buyer,
          totalKg: round1(50 + Math.random() * 200),
          batchesCount: 3,
          farmsCount: 3
        }
      : {
          farmName: `${pick(NAMES).split(' ')[1]} Farm`,
          village: pick(VILLAGES).v,
          weightKg: round1(20 + Math.random() * 80),
          quality: pick(QUALITY),
          harvestDate: recentDate(Math.floor(Math.random() * 60))
        };
    try {
      await recordScan(ownerUid, {
        refId: fakeId,
        refKind: isShip ? 'shipment' : 'batch',
        summary
      });
      ok += 1;
    } catch {
      /* ignore */
    }
  }
  return ok;
}

// ---------- Convenience ----------

export const SAMPLE_LIBRARY = {
  NAMES,
  VILLAGES,
  VARIETIES,
  PROCESSING,
  DESTINATIONS,
  STORIES
};

// Stub for future use — re-exported so admin page can fetch context.
export { getBatch, getExport };
