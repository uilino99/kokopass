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
