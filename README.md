# KokoPass

AI-powered agricultural traceability for Samoa's cacao supply chain.

This MVP scaffolds the **FARMER flow**:

1. Register / sign in (Firebase Auth)
2. Set up farm profile with map-pinned location (Leaflet)
3. Record cacao batches and generate verifiable QR codes (qrcode.react)
4. Public `/verify/:id` page anyone can scan to confirm authenticity
5. Installable PWA with offline cache (Workbox via vite-plugin-pwa)

Tech stack: **Vite + React 18**, **Firebase Auth + Firestore (with persistent cache)**, **Tailwind** (deep Pacific navy theme), **Leaflet**, **qrcode.react**, **react-router-dom**, **vite-plugin-pwa**.

---

## 1. Setup

```bash
npm install
cp .env.example .env   # fill in your kokopass-fdb47 web app credentials
```

Get the Firebase web config from:
**Firebase Console → Project settings → General → Your apps → Web app → SDK setup**.

Fill in `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=kokopass-fdb47.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kokopass-fdb47
VITE_FIREBASE_STORAGE_BUCKET=kokopass-fdb47.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

In the Firebase Console:

- **Authentication → Sign-in method**: enable **Email/Password**.
- **Firestore Database**: create a database (start in production mode).
- **Hosting**: enable.

## 2. Run locally

```bash
npm run dev
```

Open <http://localhost:5173>.

## 3. Deploy

Install the Firebase CLI once:

```bash
npm install -g firebase-tools
firebase login
```

The repo already contains `.firebaserc` (project: `kokopass-fdb47`), `firebase.json`, `firestore.rules`, and `firestore.indexes.json`.

Deploy everything:

```bash
npm run deploy:all
```

Or piece by piece:

```bash
npm run deploy           # build + hosting only
npm run deploy:rules     # security rules only
firebase deploy --only firestore:indexes
```

Your live URL will be `https://kokopass-fdb47.web.app`.

## 4. Firestore data model

```
users/{uid}        { uid, email, fullName, phone, role, createdAt }
farms/{uid}        { ownerUid, farmName, village, district, crop, variety,
                     sizeHectares, story, location: {lat,lng}, updatedAt }
batches/{batchId}  { ownerUid, farmId, farmName, village, crop, variety,
                     location, harvestDate, weightKg, quality, processing,
                     moisturePct, notes, status, createdAt }
exports/{id}       (used by exporter flow, week 2)
```

Security rules live in `firestore.rules`:

- Users can only read/write their own profile.
- A farmer can only own one farm doc (keyed by their UID).
- Batches are **publicly readable** (so QR verification works without sign-in) but only the owner can write them.
- The `exports` collection requires `role == 'exporter'`.

## 5. PWA

`vite-plugin-pwa` registers a service worker on build. To test:

```bash
npm run build
npm run preview
```

Then open the preview URL on a phone, “Add to Home Screen”, and it runs offline.

## 6. Roadmap (next sprints)

- **Week 2**: Exporter flow — scan farmer QRs, aggregate into shipments, generate export QRs.
- **Week 3**: Buyer dashboard — analytics, farmer story page, multi-batch verification.
- **Week 4**: Pilot with 1,000 farmers + 5 exporter LOIs.

## 7. Project layout

```
src/
  App.jsx
  main.jsx
  firebase.js
  index.css
  context/AuthContext.jsx
  components/
    Layout.jsx
    LocationPicker.jsx
    ProtectedRoute.jsx
  pages/
    Landing.jsx
    Login.jsx
    Register.jsx
    Dashboard.jsx
    FarmProfile.jsx
    BatchNew.jsx
    BatchView.jsx
    Verify.jsx
```
