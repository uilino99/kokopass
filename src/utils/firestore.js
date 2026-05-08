import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../firebase.js';

export const COLLECTIONS = {
  users: 'users',
  farms: 'farms',
  batches: 'batches',
  exports: 'exports',
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

export const listBatchesByOwner = async (ownerUid) => {
  const q = query(
    collection(db, COLLECTIONS.batches),
    where('ownerUid', '==', ownerUid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const writeAuditLog = (entry) =>
  addDoc(collection(db, COLLECTIONS.auditLogs), {
    ...entry,
    at: serverTimestamp()
  });

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
