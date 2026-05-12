import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase.js';

export const COLLECTIONS = {
  users: 'users',
  farms: 'farms',
  batches: 'batches',
  exports: 'exports',
  scans: 'scans',
  enrollments: 'enrollments',
  transactions: 'transactions',
  weatherAlerts: 'weather_alerts',
  buyerPortfolios: 'buyer_portfolios',
  aiPredictions: 'ai_predictions',
  auditLogs: 'audit_logs'
};

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, COLLECTIONS.users, uid));
  return snap.exists() ? snap.data() : null;
};

export const getFarm = async (uid) => {
  const snap = await getDoc(doc(db, COLLECTIONS.farms, uid));
  return snap.exists() ? snap.data() : null;
};

export const upsertFarm = (uid, data) =>
  setDoc(
    doc(db, COLLECTIONS.farms, uid),
    { ...data, ownerUid: uid, updatedAt: serverTimestamp() },
    { merge: true }
  );

export const createBatch = async (data) => {
  const ref = await addDoc(collection(db, COLLECTIONS.batches), {
    ...data,
    status: data.status || 'available',
    createdAt: serverTimestamp()
  });
  return ref.id;
};

// Pre-generate a Firestore-style ID so we can upload photos under a known
// batches/{ownerUid}/{batchId}/ path before the batch doc itself exists.
export const newBatchId = () => doc(collection(db, COLLECTIONS.batches)).id;

export const setBatch = (id, data) =>
  setDoc(doc(db, COLLECTIONS.batches, id), {
    ...data,
    status: data.status || 'available',
    createdAt: serverTimestamp()
  });

export const updateUser = (uid, data) =>
  setDoc(doc(db, COLLECTIONS.users, uid), data, { merge: true });

export const updateBatch = (id, data) =>
  updateDoc(doc(db, COLLECTIONS.batches, id), data);

export const subscribeBatchesByOwner = (ownerUid, cb) => {
  const q = query(
    collection(db, COLLECTIONS.batches),
    where('ownerUid', '==', ownerUid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

export const subscribeBatch = (id, cb) =>
  onSnapshot(doc(db, COLLECTIONS.batches, id), (snap) =>
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  );

export const listBatchesByOwner = async (ownerUid, max) => {
  const constraints = [
    where('ownerUid', '==', ownerUid),
    orderBy('createdAt', 'desc')
  ];
  if (Number.isFinite(max) && max > 0) constraints.push(limit(max));
  const q = query(collection(db, COLLECTIONS.batches), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const countBatchesByOwner = async (ownerUid) => {
  const q = query(collection(db, COLLECTIONS.batches), where('ownerUid', '==', ownerUid));
  const snap = await getCountFromServer(q);
  return snap.data().count;
};

export const writeAuditLog = (entry) =>
  addDoc(collection(db, COLLECTIONS.auditLogs), {
    ...entry,
    at: serverTimestamp()
  });

// ---------- Exporter profiles ----------

export const getExporterProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'exporterProfiles', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const upsertExporterProfile = (uid, data) =>
  setDoc(
    doc(db, 'exporterProfiles', uid),
    {
      ...data,
      ownerUid: uid,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

export const listPublicExporterProfiles = async () => {
  const q = query(
    collection(db, 'exporterProfiles'),
    where('public', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const countExportsByOwner = async (ownerUid) => {
  const q = query(collection(db, COLLECTIONS.exports), where('ownerUid', '==', ownerUid));
  const snap = await getCountFromServer(q);
  return snap.data().count;
};

export const listExportsByOwner = async (ownerUid, max = 12) => {
  const q = query(
    collection(db, COLLECTIONS.exports),
    where('ownerUid', '==', ownerUid),
    orderBy('createdAt', 'desc'),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ---------- Aggregate counters (Landing) ----------

let _aggregateCache = null;
let _aggregateInflight = null;

export function fetchAggregateCounts({ force = false } = {}) {
  if (!force && _aggregateCache) return Promise.resolve(_aggregateCache);
  if (_aggregateInflight) return _aggregateInflight;
  _aggregateInflight = (async () => {
    try {
      const [farms, batches, shipments] = await Promise.all([
        getCountFromServer(collection(db, COLLECTIONS.farms)),
        getCountFromServer(collection(db, COLLECTIONS.batches)),
        getCountFromServer(collection(db, COLLECTIONS.exports))
      ]);
      _aggregateCache = {
        farms: farms.data().count,
        batches: batches.data().count,
        shipments: shipments.data().count
      };
      return _aggregateCache;
    } finally {
      _aggregateInflight = null;
    }
  })();
  return _aggregateInflight;
}

// ---------- Single-batch reads (for exporter scanning) ----------

export const getBatch = async (id) => {
  const snap = await getDoc(doc(db, COLLECTIONS.batches, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// ---------- Exports / shipments ----------

export const createExport = async (data) => {
  const ref = await addDoc(collection(db, COLLECTIONS.exports), {
    ...data,
    status: data.status || 'shipped',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
};

export const getExport = async (id) => {
  const snap = await getDoc(doc(db, COLLECTIONS.exports, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const subscribeExport = (id, cb) =>
  onSnapshot(doc(db, COLLECTIONS.exports, id), (snap) =>
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  );

export const subscribeExportsByOwner = (ownerUid, cb) => {
  const q = query(
    collection(db, COLLECTIONS.exports),
    where('ownerUid', '==', ownerUid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

// ---------- Helpers ----------

/**
 * Pull a batch ID out of a scanned QR string. Accepts:
 *   - https://host/verify/<id>
 *   - /verify/<id>
 *   - bare <id>
 */
export const parseBatchIdFromQr = (text) => {
  if (!text) return null;
  const t = String(text).trim();
  const m = t.match(/\/verify\/([^/?#\s]+)/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{16,}$/.test(t)) return t;
  return null;
};

// ---------- Buyer scans ----------

/**
 * Idempotent: doc ID is `${ownerUid}_${refId}` so re-scanning the same
 * QR refreshes scannedAt instead of creating a new entry.
 */
export const recordScan = (ownerUid, { refId, refKind, summary }) => {
  if (!ownerUid || !refId) return Promise.resolve();
  const id = `${ownerUid}_${refId}`;
  return setDoc(
    doc(db, COLLECTIONS.scans, id),
    {
      ownerUid,
      refId,
      refKind, // 'batch' | 'shipment'
      summary: summary || null,
      scannedAt: serverTimestamp()
    },
    { merge: true }
  );
};

export const subscribeScansByOwner = (ownerUid, cb) => {
  const q = query(
    collection(db, COLLECTIONS.scans),
    where('ownerUid', '==', ownerUid),
    orderBy('scannedAt', 'desc')
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

// ---------- Pre-enrollments ----------

const makeClaimCode = () => {
  // 6 chars, no ambiguous I/O/0/1.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i += 1) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
};

export const createEnrollment = async (enrollerUid, data) => {
  const ref = await addDoc(collection(db, COLLECTIONS.enrollments), {
    enrollerUid,
    fullName: data.fullName?.trim() || '',
    phone: data.phone?.trim() || '',
    email: data.email?.trim() || '',
    village: data.village?.trim() || '',
    district: data.district?.trim() || '',
    crop: data.crop || 'Cacao',
    variety: data.variety || '',
    sizeHectares: Number(data.sizeHectares) || 0,
    story: data.story?.trim() || '',
    location: data.location || null,
    claimCode: makeClaimCode(),
    claimed: false,
    claimedUid: null,
    createdAt: serverTimestamp()
  });
  return ref.id;
};

export const bulkCreateEnrollments = async (enrollerUid, rows) => {
  // Single-document writes in parallel. For ≤500/burst this is fine;
  // beyond that, batch via writeBatch (Firestore allows 500 ops/batch).
  const results = await Promise.allSettled(
    rows.map((r) => createEnrollment(enrollerUid, r))
  );
  const ok = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - ok;
  return { ok, failed };
};

export const subscribeEnrollmentsByEnroller = (enrollerUid, cb) => {
  const q = query(
    collection(db, COLLECTIONS.enrollments),
    where('enrollerUid', '==', enrollerUid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

const normalizeClaimCode = (code) =>
  String(code || '').trim().toUpperCase().replace(/\s+/g, '');

export const findEnrollmentByCode = async (code) => {
  const c = normalizeClaimCode(code);
  if (c.length !== 6) return null;
  const q = query(
    collection(db, COLLECTIONS.enrollments),
    where('claimCode', '==', c),
    where('claimed', '==', false),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

/**
 * Atomically claims an unclaimed enrollment for the signed-in user:
 *   1. seed `farms/{uid}` with the enrollment fields
 *   2. merge the enroller link + phone into `users/{uid}`
 *   3. flip the enrollment to claimed by this uid
 *
 * Returns the claimed enrollment ID, or null if no record was found.
 */
export const claimEnrollment = async (uid, code, override = {}) => {
  const e = await findEnrollmentByCode(code);
  if (!e) return null;

  const batch = writeBatch(db);

  batch.set(
    doc(db, COLLECTIONS.farms, uid),
    {
      ownerUid: uid,
      farmName: override.farmName || e.fullName || '',
      village: e.village || '',
      district: e.district || '',
      crop: e.crop || 'Cacao',
      variety: e.variety || '',
      sizeHectares: Number(e.sizeHectares) || 0,
      story: e.story || '',
      location: e.location || null,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  batch.set(
    doc(db, COLLECTIONS.users, uid),
    {
      phone: override.phone || e.phone || '',
      enrolledByUid: e.enrollerUid || null,
      claimedEnrollmentId: e.id
    },
    { merge: true }
  );

  batch.update(doc(db, COLLECTIONS.enrollments, e.id), {
    claimed: true,
    claimedUid: uid
  });

  await batch.commit();
  return e.id;
};
