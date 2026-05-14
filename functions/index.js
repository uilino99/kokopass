/**
 * KokoPass Cloud Functions
 * ------------------------
 * Pilot scaffolding. The exports below show the four shapes we'll need
 * in production:
 *
 *   - Firestore triggers   (onBatchCreated, onShipmentCreated)
 *   - Scheduled jobs       (dailyAggregates)
 *   - HTTPS webhooks       (stripeWebhook)
 *   - Callable functions   (grantAdmin)
 *
 * Each one is a no-op or skeleton. Wire them up as features come online.
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
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

// ---------- 1. Firestore trigger: bump aggregates when a batch is created ----------

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

// New farms bump the global farm counter and the per-region tally. We
// store both `regions.<slug>` (the count) and `regionNames.<slug>` (the
// human-readable district name) so the /impact reader can render the
// pretty label without having to round-trip through farm docs.
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

// Farm edits can change the district. Move the count from the old
// region to the new region in a single document write.
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

// ---------- 2. Scheduled: daily aggregate refresh ----------

export const dailyAggregates = onSchedule(
  { schedule: 'every day 02:00', timeZone: 'Pacific/Apia', region: REGION },
  async () => {
    // Future: recompute global / per-region rollups from scratch, send a
    // pilot-progress digest email to the ops team, expire stale invites.
    logger.info('dailyAggregates.run', { at: new Date().toISOString() });
  }
);

// ---------- 3. HTTPS: Stripe webhook stub ----------

export const stripeWebhook = onRequest(
  { region: REGION, secrets: ['STRIPE_WEBHOOK_SECRET'] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }
    // Future:
    //   - verify Stripe-Signature header against STRIPE_WEBHOOK_SECRET
    //   - on `invoice.paid`: write a transactions/{id} doc
    //   - on `payment_failed`: notify the exporter via email
    logger.warn('stripeWebhook.unconfigured', {
      type: req.headers['stripe-event-type']
    });
    res.status(202).send('stub');
  }
);

// ---------- 4. Callable: grant admin (idempotent, self-rate-limited) ----------

export const grantAdmin = onCall(
  { region: REGION },
  async (request) => {
    const { uid, secret } = request.data || {};
    if (!uid || !secret) {
      throw new HttpsError('invalid-argument', 'uid and secret required.');
    }
    // Future: compare `secret` against a config value or rotated token
    // gated by an env var. For now, refuse to do anything in prod.
    logger.warn('grantAdmin.refused', { uid });
    throw new HttpsError(
      'unimplemented',
      'grantAdmin is not configured. Set admin via the Firebase console.'
    );
  }
);

// ---------- 5. Health check ----------

export const health = onRequest({ region: REGION }, (req, res) => {
  res.status(200).json({
    ok: true,
    at: new Date().toISOString(),
    service: 'kokopass-functions'
  });
});
