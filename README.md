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

```powershell
npm install
Copy-Item .env.example .env.local   # fill in your kokopass-fdb47 web app credentials
```

Get the Firebase web config from:
**Firebase Console → Project settings → General → Your apps → Web app → SDK setup**.

Fill in `.env.local`:

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
- **Storage**: enable (used for farmer avatars, farm hero photos, and batch photos).
- **Hosting**: enable.

## 2. Run locally

```powershell
npm run dev
```

Open <http://localhost:3000>.

## 3. Deploy

```powershell
npm install -g firebase-tools
firebase login
npm run deploy:all
```

Live URL: `https://kokopass-fdb47.web.app`.

Piecewise:

```powershell
npm run deploy                          # build + hosting
npm run deploy:rules                    # firestore rules
firebase deploy --only firestore:indexes
firebase deploy --only storage          # storage rules
```

## 4. Firestore data model

```
users/{uid}             { uid, email, fullName, phone, role, createdAt }
farms/{uid}             { ownerUid, farmName, village, district, crop, variety,
                          sizeHectares, story, location: {lat,lng}, updatedAt }
batches/{batchId}       { ownerUid, farmId, farmName, village, crop, variety,
                          location, harvestDate, weightKg, quality, processing,
                          moisturePct, notes, status, createdAt }
exports/{id}            (exporter flow — week 2)
transactions/{id}       (sales between farmers and exporters)
weather_alerts/{id}     (server-written, public read)
buyer_portfolios/{uid}  (buyer dashboard config)
ai_predictions/{id}     (server-written, owner read)
audit_logs/{id}         (append-only)
```

Security rules in `firestore.rules`:

- Users read/write only their own profile.
- A farmer owns one farm doc keyed by their UID.
- Batches are **publicly readable** (so QR verification works without sign-in); only the owner writes.
- `exports` and `buyer_portfolios` are role-gated.
- `weather_alerts` and `ai_predictions` are server-written via Cloud Functions.
- `audit_logs` are append-only and never client-readable.

Storage layout (`storage.rules`):

```
users/{uid}/avatar.jpg                      farmer face — owner write, public read
farms/{uid}/hero.jpg                        farm hero photo — owner write, public read
batches/{ownerUid}/{batchId}/photo-{n}.jpg  batch photos — owner write, public read
```

All writes require auth, the owner UID embedded in the path, an `image/*`
content type, and a max size of 5 MB. Reads are public so the `/verify/:id`
page renders for any buyer without a sign-in. Photos are compressed
client-side to 1600 px on the long edge at JPEG quality 0.82 before upload.

## 5. PWA

`vite-plugin-pwa` registers a service worker at build time:

```powershell
npm run build
npm run preview
```

Open the preview URL on a phone, “Add to Home Screen”, and run offline.

## 6. Roadmap

- **Week 2**: Exporter flow — scan farmer QRs, aggregate into shipments, export QR.
- **Week 3**: Buyer dashboard — analytics, farmer story page, multi-batch verification.
- **Week 4**: Pilot — 1,000 farmers + 5 exporter LOIs.

## 7. Project layout

```
kokopass/
├── src/
│   ├── App.jsx                      # Routes
│   ├── main.jsx                     # React entry
│   ├── index.css                    # Tailwind + theme
│   ├── firebase.js                  # Firebase init (auth, db)
│   ├── contexts/
│   │   └── AuthContext.jsx          # Auth state + register/login/logout
│   ├── hooks/
│   │   └── useAuth.js               # Auth hook
│   ├── utils/
│   │   ├── firestore.js             # Collections + helpers
│   │   ├── offline.js               # Online status hook
│   │   └── validation.js            # Form validators
│   ├── components/
│   │   ├── Layout.jsx
│   │   ├── LocationPicker.jsx       # Leaflet map pin
│   │   └── ProtectedRoute.jsx
│   └── pages/
│       ├── Landing.jsx
│       ├── Login.jsx
│       ├── Register.jsx
│       ├── Dashboard.jsx
│       ├── FarmProfile.jsx
│       ├── BatchNew.jsx
│       ├── BatchView.jsx            # QR pass display
│       └── Verify.jsx               # Public scan page
├── public/
│   ├── icon.svg
│   └── robots.txt
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── package.json
├── vite.config.js                   # Vite + vite-plugin-pwa (port 3000)
├── tailwind.config.js               # Pacific navy theme
└── .env.example
```

## 8. Troubleshooting

**`npm install` fails**

```powershell
npm cache clean --force
Remove-Item -Recurse node_modules
Remove-Item package-lock.json
npm install
```

**Firebase API key error / can't sign in**

- Confirm `.env.local` exists at the project root.
- Verify all `VITE_FIREBASE_*` keys are set.
- Restart the dev server (`npm run dev`).
- Check the browser console for the underlying error.

**`firebase: command not found`**

```powershell
npm install -g firebase-tools
firebase --version
```

**Port 3000 already in use**

```powershell
npm run dev -- --port 3001
```
