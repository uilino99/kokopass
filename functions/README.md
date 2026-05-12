# KokoPass Cloud Functions

Server-side foundation for KokoPass: Firestore triggers, scheduled jobs, HTTPS webhooks, and callable functions.

## What's in here

| Export | Kind | Purpose |
|---|---|---|
| `onBatchCreated` | Firestore trigger | Bumps `aggregates/global` when a farmer records a batch. |
| `onShipmentCreated` | Firestore trigger | Bumps `aggregates/global` when an exporter ships. |
| `dailyAggregates` | Scheduled (02:00 Pacific/Apia) | Stub for nightly rollups, digest emails, etc. |
| `stripeWebhook` | HTTPS POST | Stub for `$4.55/bag` invoice + payment hooks. Wire to Stripe once keys are loaded. |
| `grantAdmin` | Callable | Stub. Currently refuses; admin is set manually in the Firebase console. |
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

- `aggregates/global` — `{ batches, kg, shipments, shippedKg, updatedAt }`. Public-read, client-write blocked. Use this to power the Landing counters in production (replacing the per-collection `getCountFromServer` reads we use today).

## Adding a new function

1. Export it from `index.js`.
2. `firebase deploy --only functions:<yourFunctionName>`.
3. If it needs config, prefer `defineSecret` / `defineString` from `firebase-functions/params` over `process.env`.
