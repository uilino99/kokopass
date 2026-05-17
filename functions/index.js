/**
 * KokoPass Cloud Functions
 * ------------------------
 * Five categories:
 *
 *   - Firestore aggregate triggers   (onBatchCreated, onShipmentCreated,
 *                                     onFarmCreated, onFarmUpdated)
 *   - Audit-log triggers             (auditFarmWrite, auditBatchWrite,
 *                                     auditShipmentWrite, auditEnrollmentWrite,
 *                                     auditInquiryWrite, auditMembershipWrite)
 *   - Membership claims sync         (syncMembershipClaims)
 *   - Scheduled jobs                 (dailyAggregates)
 *   - HTTPS / Callable               (stripeWebhook, grantAdmin, health)
 */

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentWritten
} from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';

initializeApp();
const db = getFirestore();

const REGION = 'us-central1';

/** Make a district string safe as a Firestore field name. */
const slugifyDistrict = (raw) =>
  String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'unknown';

/** Pick the district label from a farm doc, falling back to village. */
const districtOf = (farm) =>
  (farm?.district || farm?.village || 'Unknown').toString().trim() || 'Unknown';

// ===========================================================================
//  1. Aggregate triggers
// ===========================================================================

export const onBatchCreated = onDocumentCreated(
  { document: 'batches/{batchId}', region: REGION },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const weight = Number(data.weightKg) || 0;
    await db.doc('aggregates/global').set(
      {
        batches: FieldValue.increment(1),
        kg: FieldValue.increment(weight),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    logger.info('batch.created', { batchId: event.params.batchId, weight });
  }
);

export const onShipmentCreated = onDocumentCreated(
  { document: 'exports/{shipmentId}', region: REGION },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    await db.doc('aggregates/global').set(
      {
        shipments: FieldValue.increment(1),
        shippedKg: FieldValue.increment(Number(data.totalKg) || 0),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    logger.info('shipment.created', { shipmentId: event.params.shipmentId });
  }
);

export const onFarmCreated = onDocumentCreated(
  { document: 'farms/{farmId}', region: REGION },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const district = districtOf(data);
    const slug = slugifyDistrict(district);
    await db.doc('aggregates/global').set(
      {
        farms: FieldValue.increment(1),
        [`regions.${slug}`]: FieldValue.increment(1),
        [`regionNames.${slug}`]: district,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    logger.info('farm.created', { farmId: event.params.farmId, slug });
  }
);

export const onFarmUpdated = onDocumentUpdated(
  { document: 'farms/{farmId}', region: REGION },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const beforeDistrict = districtOf(before);
    const afterDistrict = districtOf(after);
    if (beforeDistrict === afterDistrict) return;

    const beforeSlug = slugifyDistrict(beforeDistrict);
    const afterSlug = slugifyDistrict(afterDistrict);
    if (beforeSlug === afterSlug) return;

    await db.doc('aggregates/global').set(
      {
        [`regions.${beforeSlug}`]: FieldValue.increment(-1),
        [`regions.${afterSlug}`]: FieldValue.increment(1),
        [`regionNames.${afterSlug}`]: afterDistrict,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    logger.info('farm.regionMoved', {
      farmId: event.params.farmId,
      from: beforeSlug,
      to: afterSlug
    });
  }
);

// Buyer scans the QR -> /scans/{ownerUid_refId} is created (or
// merged, on re-scan). Because the doc ID is deterministic per buyer
// per ref, onDocumentCreated only fires the *first* time a given
// buyer scans a given QR — so this counter measures *unique buyers
// who traced this batch / shipment*, not total scan events.
export const onScanCreated = onDocumentCreated(
  { document: 'scans/{scanId}', region: REGION },
  async (event) => {
    const data = event.data?.data();
    if (!data?.refId) return;
    await db.doc(`scanCounts/${data.refId}`).set(
      {
        refId: data.refId,
        refKind: data.refKind || 'batch',
        count: FieldValue.increment(1),
        lastAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    logger.info('scan.counted', {
      refId: data.refId,
      refKind: data.refKind || 'batch'
    });
  }
);

// ===========================================================================
//  2. Audit-log triggers
// ===========================================================================
//
// Every interesting write produces one audit_logs row. The actor is the
// document's ownerUid where known. True actor attribution will come when
// we move sensitive writes through callable Functions (which have access
// to request.auth) — until then this captures who *owns* the affected
// doc, which is sufficient for moderation and tamper-evident history.

const MAX_DIFF_FIELDS = 32;

function computeDiff(before, after) {
  if (!before && after) return Object.keys(after).slice(0, MAX_DIFF_FIELDS);
  if (before && !after) return Object.keys(before).slice(0, MAX_DIFF_FIELDS);
  if (!before || !after) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed = [];
  for (const k of keys) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      changed.push(k);
      if (changed.length >= MAX_DIFF_FIELDS) break;
    }
  }
  return changed;
}

function makeAuditHandler({ collection, ownerField, paramKey }) {
  return async (event) => {
    const before = event.data?.before?.exists ? event.data.before.data() : null;
    const after = event.data?.after?.exists ? event.data.after.data() : null;
    let action;
    if (!before && after) action = 'create';
    else if (before && !after) action = 'delete';
    else action = 'update';

    const owner = after?.[ownerField] || before?.[ownerField] || null;
    const orgId = after?.orgId || before?.orgId || null;
    const docId = event.params[paramKey];

    try {
      await db.collection('audit_logs').add({
        actorUid: owner,
        action,
        collection,
        docId,
        orgId,
        diff: computeDiff(before, after),
        at: FieldValue.serverTimestamp()
      });
    } catch (err) {
      logger.warn('audit.failed', { collection, docId, message: err?.message });
    }
  };
}

export const auditFarmWrite = onDocumentWritten(
  { document: 'farms/{farmId}', region: REGION },
  makeAuditHandler({ collection: 'farms', ownerField: 'ownerUid', paramKey: 'farmId' })
);

export const auditBatchWrite = onDocumentWritten(
  { document: 'batches/{batchId}', region: REGION },
  makeAuditHandler({ collection: 'batches', ownerField: 'ownerUid', paramKey: 'batchId' })
);

export const auditShipmentWrite = onDocumentWritten(
  { document: 'exports/{shipmentId}', region: REGION },
  makeAuditHandler({ collection: 'exports', ownerField: 'ownerUid', paramKey: 'shipmentId' })
);

export const auditEnrollmentWrite = onDocumentWritten(
  { document: 'enrollments/{enrollmentId}', region: REGION },
  makeAuditHandler({
    collection: 'enrollments',
    ownerField: 'enrollerUid',
    paramKey: 'enrollmentId'
  })
);

export const auditInquiryWrite = onDocumentWritten(
  { document: 'inquiries/{inquiryId}', region: REGION },
  makeAuditHandler({
    collection: 'inquiries',
    ownerField: 'targetUid',
    paramKey: 'inquiryId'
  })
);

export const auditMembershipWrite = onDocumentWritten(
  {
    document: 'organizations/{orgId}/members/{memberUid}',
    region: REGION
  },
  async (event) => {
    const before = event.data?.before?.exists ? event.data.before.data() : null;
    const after = event.data?.after?.exists ? event.data.after.data() : null;
    let action;
    if (!before && after) action = 'create';
    else if (before && !after) action = 'delete';
    else action = 'update';
    try {
      await db.collection('audit_logs').add({
        actorUid: event.params.memberUid,
        action,
        collection: 'organizations.members',
        docId: `${event.params.orgId}/${event.params.memberUid}`,
        orgId: event.params.orgId,
        diff: computeDiff(before, after),
        at: FieldValue.serverTimestamp()
      });
    } catch (err) {
      logger.warn('audit.failed', {
        collection: 'organizations.members',
        message: err?.message
      });
    }
  }
);

// ===========================================================================
//  3. Membership-claims sync
// ===========================================================================
//
// When a membership doc is written, mirror the user's full membership map
// into their Firebase Auth custom claims so Firestore rules can check
// `request.auth.token.orgs[orgId]` cheaply (no extra doc read per check).
//
// Caveat: custom claims have a ~1 KB limit on the ID token. We cap the
// claim at MAX_ORGS_IN_CLAIM entries; the full Firestore membership doc
// remains canonical for anything beyond that.

const MAX_ORGS_IN_CLAIM = 20;

export const syncMembershipClaims = onDocumentWritten(
  {
    document: 'organizations/{orgId}/members/{memberUid}',
    region: REGION
  },
  async (event) => {
    const uid = event.params.memberUid;
    try {
      // Find all current memberships for this user across all orgs.
      const snap = await db
        .collectionGroup('members')
        .where('uid', '==', uid)
        .get();
      const orgs = {};
      snap.forEach((doc) => {
        const path = doc.ref.path;
        // organizations/{orgId}/members/{memberUid}
        const orgId = path.split('/')[1];
        const data = doc.data();
        if (data?.role) orgs[orgId] = data.role;
      });
      // Cap to stay under the claim size budget.
      const trimmed = {};
      Object.entries(orgs)
        .slice(0, MAX_ORGS_IN_CLAIM)
        .forEach(([k, v]) => {
          trimmed[k] = v;
        });

      const userRecord = await getAuth().getUser(uid).catch(() => null);
      if (!userRecord) {
        logger.warn('membership.claimsSkipped', { uid, reason: 'user not found' });
        return;
      }
      const existing = userRecord.customClaims || {};
      await getAuth().setCustomUserClaims(uid, {
        ...existing,
        orgs: trimmed
      });
      logger.info('membership.claimsUpdated', {
        uid,
        orgCount: Object.keys(trimmed).length
      });
    } catch (err) {
      logger.error('membership.claimsFailed', { uid, message: err?.message });
    }
  }
);

// ===========================================================================
//  4. Scheduled
// ===========================================================================

export const dailyAggregates = onSchedule(
  { schedule: 'every day 02:00', timeZone: 'Pacific/Apia', region: REGION },
  async () => {
    // Future: recompute global / per-region rollups from scratch, send a
    // pilot-progress digest email to the ops team, archive audit logs
    // older than 90 days.
    logger.info('dailyAggregates.run', { at: new Date().toISOString() });
  }
);

// Flip status='verified' certifications to 'expired' once their
// expiresAt has passed. Runs hourly so a freshly-expired cert clears
// from public badges within an hour without waiting for the next page
// load to compute it client-side.
export const expireCertifications = onSchedule(
  { schedule: 'every 60 minutes', region: REGION },
  async () => {
    const now = new Date();
    const snap = await db
      .collection('certifications')
      .where('status', '==', 'verified')
      .where('expiresAt', '<=', now)
      .limit(500)
      .get();

    if (snap.empty) {
      logger.info('certs.expireRun', { expired: 0 });
      return;
    }

    const batch = db.batch();
    snap.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'expired',
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
    logger.info('certs.expireRun', { expired: snap.size });
  }
);

// ===========================================================================
//  5. HTTPS / Callable
// ===========================================================================

export const stripeWebhook = onRequest(
  { region: REGION, secrets: ['STRIPE_WEBHOOK_SECRET'] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }
    logger.warn('stripeWebhook.unconfigured', {
      type: req.headers['stripe-event-type']
    });
    res.status(202).send('stub');
  }
);

export const grantAdmin = onCall(
  { region: REGION },
  async (request) => {
    const { uid, secret } = request.data || {};
    if (!uid || !secret) {
      throw new HttpsError('invalid-argument', 'uid and secret required.');
    }
    // Future: compare `secret` against a rotated token in Functions secrets.
    // For now we deliberately refuse — admin is set manually via:
    //   firebase functions:shell
    //   > await admin.auth().setCustomUserClaims('<uid>', { admin: true })
    // or a one-off Node script using the Admin SDK.
    logger.warn('grantAdmin.refused', { uid });
    throw new HttpsError(
      'unimplemented',
      'grantAdmin is not configured. Set the `admin: true` claim manually via the Admin SDK.'
    );
  }
);

// ===========================================================================
//  inviteOrgMember — callable: look up by email and add as org member
// ===========================================================================
//
// Called by /org/:orgId/members. The client can't look up users by
// email directly (privacy), so this function bridges the gap. The
// invited user must already have a KokoPass account; if not, we
// return a clear "ask them to register first" error.

const ALLOWED_ORG_ROLES = ['admin', 'staff', 'fieldAgent', 'auditor'];

export const inviteOrgMember = onCall(
  { region: REGION },
  async (request) => {
    const { auth, data } = request;
    if (!auth?.uid) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }

    const orgId = String(data?.orgId || '').trim();
    const email = String(data?.email || '').trim().toLowerCase();
    const requestedRole = data?.role;
    const role = ALLOWED_ORG_ROLES.includes(requestedRole) ? requestedRole : 'staff';
    const displayName = String(data?.displayName || '').trim();
    const regions = Array.isArray(data?.regions) ? data.regions : [];

    if (!orgId) throw new HttpsError('invalid-argument', 'orgId is required.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError('invalid-argument', 'A valid email is required.');
    }

    // Authorise the caller: org admin or platform admin.
    const isPlatformAdmin = auth.token?.admin === true;
    if (!isPlatformAdmin) {
      const callerMember = await db
        .doc(`organizations/${orgId}/members/${auth.uid}`)
        .get();
      if (!callerMember.exists || callerMember.data()?.role !== 'admin') {
        throw new HttpsError(
          'permission-denied',
          'Only org admins can invite new members.'
        );
      }
    }

    // Resolve the invitee. The Admin SDK enforces lower-case email
    // lookups; we normalised above.
    let target;
    try {
      target = await getAuth().getUserByEmail(email);
    } catch (err) {
      if (err?.code === 'auth/user-not-found') {
        // Fall back to a pending invite. The new user will auto-claim
        // it the moment they register with this email — see
        // claimPendingInvites below + the AuthContext register hook.
        const orgSnap = await db.doc(`organizations/${orgId}`).get();
        const orgName = orgSnap.exists ? (orgSnap.data()?.name || '') : '';
        await db.collection('pendingInvites').add({
          orgId,
          orgName,
          email,
          role,
          regions,
          displayName,
          invitedBy: auth.uid,
          status: 'pending',
          createdAt: FieldValue.serverTimestamp()
        });
        logger.info('inviteOrgMember.pending', { orgId, email });
        return { status: 'pending', email, role };
      }
      logger.error('inviteOrgMember.lookupFailed', { email, message: err?.message });
      throw new HttpsError('internal', 'Could not look up that user.');
    }

    // Idempotency: refuse to overwrite an existing membership.
    const memberRef = db.doc(`organizations/${orgId}/members/${target.uid}`);
    const existing = await memberRef.get();
    if (existing.exists) {
      throw new HttpsError(
        'already-exists',
        `${target.email || 'That user'} is already a member of this organization.`
      );
    }

    // Write. The syncMembershipClaims trigger fires next and updates
    // the new member's request.auth.token.orgs map.
    await memberRef.set({
      uid: target.uid,
      role,
      regions,
      displayName: displayName || target.displayName || '',
      invitedBy: auth.uid,
      joinedAt: FieldValue.serverTimestamp()
    });

    logger.info('inviteOrgMember.added', {
      orgId,
      memberUid: target.uid,
      role
    });

    return {
      status: 'added',
      uid: target.uid,
      email: target.email || null,
      displayName: target.displayName || null,
      role
    };
  }
);

// ===========================================================================
//  claimPendingInvites — callable: a fresh user picks up any invites
// ===========================================================================
//
// Called from AuthContext.register right after the user doc is
// written. Walks pendingInvites where email matches the new user's
// token email, creates the membership doc, and marks the invite as
// claimed. Idempotent — already-member rows are flipped to
// 'superseded' without overwriting the existing membership.

export const claimPendingInvites = onCall(
  { region: REGION },
  async (request) => {
    const { auth } = request;
    if (!auth?.uid) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    const email = String(auth.token?.email || '').toLowerCase();
    if (!email) {
      return { claimed: 0, orgs: [] };
    }
    const snap = await db
      .collection('pendingInvites')
      .where('email', '==', email)
      .where('status', '==', 'pending')
      .limit(20)
      .get();
    if (snap.empty) {
      return { claimed: 0, orgs: [] };
    }

    const batch = db.batch();
    const claimedOrgs = [];
    for (const doc of snap.docs) {
      const d = doc.data();
      const memberRef = db.doc(`organizations/${d.orgId}/members/${auth.uid}`);
      const existing = await memberRef.get();
      if (existing.exists) {
        batch.update(doc.ref, {
          status: 'superseded',
          claimedBy: auth.uid,
          claimedAt: FieldValue.serverTimestamp()
        });
        continue;
      }
      batch.set(memberRef, {
        uid: auth.uid,
        role: d.role || 'staff',
        regions: d.regions || [],
        displayName: d.displayName || auth.token?.name || '',
        invitedBy: d.invitedBy || null,
        joinedAt: FieldValue.serverTimestamp()
      });
      batch.update(doc.ref, {
        status: 'claimed',
        claimedBy: auth.uid,
        claimedAt: FieldValue.serverTimestamp()
      });
      claimedOrgs.push({ orgId: d.orgId, orgName: d.orgName, role: d.role });
    }
    await batch.commit();
    logger.info('pendingInvites.claimed', {
      email,
      uid: auth.uid,
      claimed: claimedOrgs.length
    });
    return { claimed: claimedOrgs.length, orgs: claimedOrgs };
  }
);

export const health = onRequest({ region: REGION }, (req, res) => {
  res.status(200).json({
    ok: true,
    at: new Date().toISOString(),
    service: 'kokopass-functions'
  });
});
