# Spynx — Node.js + React Edition

Same product as the Next.js build — geolocation hotel/hostel discovery,
direct WhatsApp/call booking, manager and admin portals — restructured
as a standalone **Express API backend** and a **Vite/React frontend** in
separate folders, deployed independently.

```
spynx-node/
├── backend/          Express API — auth, properties, manager, admin
│   ├── src/
│   │   ├── config/env.js
│   │   ├── db.js
│   │   ├── middleware/     auth (JWT cookie), error handling
│   │   ├── routes/         auth, properties, manager, admin
│   │   ├── utils/          geo, geocode, mail
│   │   ├── app.js          Express app assembly
│   │   └── server.js       entry point
│   ├── database/schema.sql
│   └── package.json
└── frontend/          Vite + React SPA
    ├── src/
    │   ├── api/client.js       fetch wrapper (credentials: 'include')
    │   ├── hooks/               useAuth, useTranslation, useGeolocation
    │   ├── components/          PropertyCard, BookingModal, InventoryManager, ...
    │   ├── pages/                Discovery, SignIn, ManagerDashboard, AdminDashboard, ...
    │   ├── lib/                  geo.js, whatsapp.js, i18n.js
    │   └── locales/              en.json, fr.json, es.json
    └── package.json
```

---

## How the two halves talk

- **Session**: login sets an **httpOnly cookie** from the backend
  (`spynx_session`). The frontend never touches the token directly —
  `src/api/client.js` sends `credentials: 'include'` on every request,
  and the browser attaches the cookie automatically. This is why CORS in
  `backend/src/app.js` is configured with an explicit origin + `credentials: true`
  rather than `origin: '*'` — cookies can't be sent to a wildcard origin.
- **Local dev**: Vite's dev-server proxy (`frontend/vite.config.js`)
  forwards `/api/*` to `localhost:4000`, so the frontend can call
  `fetch('/api/properties/nearby')` without hardcoding a port and
  without hitting CORS at all in development.
- **Production**: set `VITE_API_URL` in the frontend's env to the
  deployed backend's URL, and set `APP_URL` in the backend's env to the
  deployed frontend's URL (used for CORS origin + email links).

---

## Setup

**Backend:**
```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL, AUTH_SECRET, etc.

createdb spynx
psql spynx -f database/schema.sql

npm run dev             # http://localhost:4000
```

**Frontend** (separate terminal):
```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

Seed an admin account directly (no public admin signup, by design):
```bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 12))"
```
```sql
INSERT INTO users (email, password_hash, full_name, role, email_verified_at)
VALUES ('you@spynx.app', '<hash>', 'Your Name', 'admin', now());
```

---

## What changed from the Next.js version, and why

- **Route Handlers → Express routes.** Each Next.js `route.ts` became an
  Express router (`backend/src/routes/*.routes.js`) with the identical
  SQL and validation — the domain logic didn't need to change, only the
  request/response plumbing around it.
- **Server Components → client-fetched pages.** There's no server-side
  rendering here; every page is a client component that calls the API
  on mount (`useEffect` + `api.get(...)`) and renders a loading state
  first. This is the fundamental tradeoff of splitting frontend/backend
  this way — you trade SSR's fast first paint for a simpler, fully
  decoupled deployment story.
- **Middleware role-guard → `ProtectedRoute` + server-side `requireRole`.**
  Next's edge middleware doesn't exist in a plain SPA; `ProtectedRoute.jsx`
  does the equivalent client-side redirect, but exactly as before, it's
  a UX convenience only — `requireRole` in the Express middleware is the
  actual boundary, checked fresh on every API call.
- **`lib/` duplicated, not shared**, between `backend/src/utils/geo.js`
  and `frontend/src/lib/geo.js` (same for the WhatsApp link builder).
  In a monorepo you'd hoist these into a shared package; kept duplicated
  here to keep the two folders genuinely independent, deployable, and
  installable on their own, per the ask.

Deployment guidance (Vercel/Neon/etc.), going live, and the manager
acquisition playbook from the earlier handbook all still apply — the
infrastructure choices don't change, only the backend now deploys as a
standalone Node service (Render, Railway, Fly.io, or a Vercel Node
function) rather than living inside the Next.js app.
