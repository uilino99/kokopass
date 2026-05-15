# KokoPass Cloud Functions

Server-side foundation for KokoPass: Firestore triggers, scheduled jobs, HTTPS webhooks, and callable functions.

## What's in here

**Aggregate triggers**

| Export | Kind | Purpose |
|---|---|---|
| `onBatchCreated` | Firestore trigger | Bumps `aggregates/global` when a farmer records a batch. |
| `onShipmentCreated` | Firestore trigger | Bumps `aggregates/global` when an exporter ships. |
| `onFarmCreated` | Firestore trigger | Bumps `aggregates/global.farms` and `regions.<slug>` for the per-region breakdown on `/impact`. |
| `onFarmUpdated` | Firestore trigger | Moves the count between `regions.<slug>` when a farm's district changes. |

**Audit-log triggers** (write to `audit_logs/{id}` on every interesting change)

| Export | Watches |
|---|---|
| `auditFarmWrite` | `farms/{farmId}` |
| `auditBatchWrite` | `batches/{batchId}` |
| `auditShipmentWrite` | `exports/{shipmentId}` |
| `auditEnrollmentWrite` | `enrollments/{enrollmentId}` |
| `auditInquiryWrite` | `inquiries/{inquiryId}` |
| `auditMembershipWrite` | `organizations/{orgId}/members/{memberUid}` |

**Membership & identity**

| Export | Kind | Purpose |
|---|---|---|
| `syncMembershipClaims` | Firestore trigger on `organizations/*/members/*` | Mirrors a user's full membership map into `request.auth.token.orgs` so Firestore rules can check `orgRole(orgId)` with zero extra reads. Capped at 20 entries to stay under the 1KB claim budget. |

**Scheduled, HTTPS, callable**

| Export | Kind | Purpose |
|---|---|---|
| `dailyAggregates` | Scheduled (02:00 Pacific/Apia) | Stub for nightly rollups, digest emails, log archival. |
| `stripeWebhook` | HTTPS POST | Stub for `$4.55/bag` invoice + payment hooks. Wire to Stripe once keys are loaded. |
| `grantAdmin` | Callable | Refuses by design. Platform admin is set manually via the Admin SDK. |
| `health` | HTTPS GET | Returns `{ok: true}` — useful for uptime monitoring. |

## Prerequisites

- A Firebase project on the **Blaze** (pay-as-you-go) plan — Cloud Functions are gated to Blaze.
- Node 20 locally (matches the `runtime` declared in `firebase.json`).
- `firebase-tools` installed: `npm i -g firebase-tools`.

## Setup

```powershell
cd functions
npm install
```

## Local development with emulators

The repo's `firebase.json` already wires up the emulator suite:

```powershell
firebase emulators:start --only functions,firestore,auth,storage
```

The Emulator UI runs at <http://localhost:4000>.

## Deploy

```powershell
firebase deploy --only functions
```

Or one function at a time:

```powershell
firebase deploy --only functions:health
firebase deploy --only functions:onBatchCreated
```

## Secrets

When you wire up Stripe, add the webhook secret via Firebase secrets:

```powershell
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

The function declares `secrets: ['STRIPE_WEBHOOK_SECRET']` so it's injected as `process.env.STRIPE_WEBHOOK_SECRET` at runtime.

## Schema written by triggers

`aggregates/global` is the canonical server-maintained doc. Public-read, client-write blocked. Shape:

```jsonc
{
  "batches": 0,            // bumped by onBatchCreated
  "kg": 0,                 // bumped by onBatchCreated (sum of weightKg)
  "shipments": 0,          // bumped by onShipmentCreated
  "shippedKg": 0,          // bumped by onShipmentCreated (sum of totalKg)
  "farms": 0,              // bumped by onFarmCreated
  "regions": {             // bumped by onFarmCreated / onFarmUpdated
    "aleipata": 87,        //   key = slugify(district)
    "savaii": 62
  },
  "regionNames": {         // pretty labels paired with the slug keys
    "aleipata": "Aleipata",
    "savaii": "Savai'i"
  },
  "updatedAt": "<server ts>"
}
```

The Landing counters and `/impact` page already prefer `aggregates/global` when present (kg, shippedKg, regions) and fall back to per-collection `getCountFromServer` / live farm reads otherwise. After your first `firebase deploy --only functions`, those reads silently switch to the cheaper aggregate path.

## Audit log shape

`audit_logs/{id}` rows are written exclusively by the triggers above. Client writes are blocked. Shape:

```jsonc
{
  "actorUid": "<doc owner uid, when known>",
  "action": "create" | "update" | "delete",
  "collection": "farms" | "batches" | "exports" | "enrollments" | "inquiries" | "organizations.members",
  "docId": "<id of the affected doc>",
  "orgId": "<scoping org id, if any>",   // nullable
  "diff": ["fieldA", "fieldB"],          // changed field names, capped at 32
  "at": "<server ts>"
}
```

Read access:

- **Platform admin** (`request.auth.token.admin == true`) reads everything.
- **Org admins** read logs where `orgId` matches an org they admin (via `request.auth.token.orgs[orgId] == 'admin'`).
- Clients can't write — only the Admin SDK can.

Composite indexes are configured for `(orgId, at desc)`, `(collection, at desc)`, and `(actorUid, at desc)` to back the future admin browse UI.

## Granting platform admin

`grantAdmin` is a deliberate stub — we don't want a callable that sets the `admin` claim, because anyone with the auth token could in principle invoke it. Set the claim manually, once per pilot operator, via the Admin SDK:

```js
// node script, run once with GOOGLE_APPLICATION_CREDENTIALS set
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

initializeApp();
await getAuth().setCustomUserClaims('<UID>', { admin: true });
console.log('done');
```

Have the user sign out + back in (or call `getIdToken(true)`) to refresh the ID token with the new claim. Firestore rules will then accept `isPlatformAdmin()`.

## Adding a new function

1. Export it from `index.js`.
2. `firebase deploy --only functions:<yourFunctionName>`.
3. If it needs config, prefer `defineSecret` / `defineString` from `firebase-functions/params` over `process.env`.
