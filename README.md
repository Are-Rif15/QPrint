# QPrint

A small campus online printing service. Students upload documents, choose print
options, pay by QR, and collect the printed pages. The shop owner runs
everything from one laptop connected to an HP Smart Tank 520.

**Phase 1 / MVP.** Built milestone by milestone.

- **Milestone 1 (done):** project setup, database, owner login, route guard, home page
- Milestone 2: uploads, print options, live pricing, PDF preview
- Milestone 3: QR payment, order tracking, "my orders on this device"
- Milestone 4: owner dashboard, payments, settings
- Milestone 5: print queue and printer integration
- Milestone 6: cleanup jobs, backups, security hardening

## Tech stack

React + Vite + React Router + Tailwind CSS · Node.js + Express · SQLite
(better-sqlite3) · JWT in an httpOnly cookie · bcryptjs · npm workspaces.

No student accounts in Phase 1: students order as guests and track their order
with a long random link.

## Requirements

- Node.js **20.19+** (developed on Node 24)
- npm 10+
- Windows (the printer driver target), macOS/Linux also fine for development

## Project structure

```
client/                  React app (Vite, Tailwind)
  src/pages/             Home, OwnerLogin, OwnerDashboard, NotFound
  src/auth/              AuthProvider (session restore via /api/auth/me)
  src/components/        Layout, RequireOwner, ShopStatusBanner, PageLoader
server/
  src/schema.sql         Full Phase 1 database schema
  src/scripts/init-db.js Creates tables + seeds owner, prices, settings
  src/auth/              JWT, cookie, owner-only middleware, login routes
  src/business/status.js Allowed order status transitions (+ tests)
  src/lib/               money rounding, storage paths, settings helpers
  src/tests/             node:test suites
server/data/qprint.db    SQLite database (gitignored)
storage/                 Uploaded documents / proofs / QR image (gitignored)
scripts/dev.js           Runs API + frontend together for development
```

## Setup

1. Install dependencies (installs both workspaces):

   ```powershell
   npm install
   ```

2. Create your environment file:

   ```powershell
   copy .env.example .env
   ```

   Then edit `.env`:
   - `OWNER_NAME`, `OWNER_EMAIL`, `OWNER_PASSWORD` - the single owner account
     (password must be at least 8 characters)
   - `JWT_SECRET` - generate one with:

     ```powershell
     node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
     ```

3. Create and seed the database:

   ```powershell
   npm run init:db
   ```

   This is idempotent. To change the owner password later, update
   `OWNER_PASSWORD` in `.env`, then run:

   ```powershell
   npm run init:db -- --reset-owner-password
   ```

4. Start development mode:

   ```powershell
   npm run dev
   ```

   - App: <http://localhost:5173>
   - API: <http://localhost:4000> (Vite proxies `/api` here)

5. Sign in at <http://localhost:5173/owner/login> with the values from `.env`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start API and Vite together |
| `npm run dev:server` | API only, restarts on file changes |
| `npm run dev:client` | Vite only |
| `npm run init:db` | Apply schema and seed owner / prices / settings |
| `npm test` | Run money, status-transition and schema tests |
| `npm run build` | Build the React app into `client/dist` |
| `npm start` | Start the server; serves the built app too when `client/dist` exists |

## Production mode (single process, one port)

```powershell
npm run build
$env:NODE_ENV="production"   # turns on Secure cookies (HTTPS via Cloudflare Tunnel)
npm start
```

Open <http://localhost:4000>. The Express server serves the API and the built
React app from the same origin, so the auth cookie just works and no CORS
configuration is needed.

To expose it to students, point a Cloudflare Tunnel at `http://localhost:4000`
(details will be added in Milestone 6, together with Turnstile and rate limits).

## Verify Milestone 1

1. `npm run init:db` prints the database path and owner email.
2. `npm run dev`, open <http://localhost:5173>:
   - the open/closed banner comes from the `settings` table;
   - the order buttons are disabled placeholders (Milestone 2);
   - "Owner login" opens the login form.
3. Open <http://localhost:5173/owner> in a private window - you are redirected
   to the login page.
4. Sign in. Refresh: you stay signed in. Log out: the cookie is cleared.
5. Unauthenticated API check:

   ```powershell
   curl.exe -s -o NUL -w "%{http_code}`n" http://localhost:4000/api/auth/me
   # 401
   ```

6. `npm test` - 16 tests pass.

## Security notes (current state)

- Owner only: no registration endpoint; the account is seeded from `.env`.
- Passwords hashed with bcrypt (cost 12); login compares against a dummy hash
  for unknown emails to avoid timing leaks.
- JWT in an **httpOnly**, `SameSite=Lax` cookie; `Secure` in production.
- Login rate limit: 10 attempts per IP per 15 minutes.
- Helmet security headers; JSON-only API; parameterised SQL everywhere.
- `/storage` is outside the web root and is never served statically. Students
  will never get file download links.
- `.env`, `storage/`, `backups/`, `server/data/` and build output are gitignored.

## Troubleshooting

- **"The database ... is not initialised"** - run `npm run init:db`.
- **"JWT_SECRET is missing or too short"** - copy `.env.example` to `.env` and
  generate a long random secret (see Setup).
- **"Missing OWNER_... in .env"** - the init script needs all three owner values.
- **Port already in use** - stop the other process or change `PORT` in `.env`
  (also update the Vite proxy target in `client/vite.config.js`).
- **Forgot the owner password** - set a new `OWNER_PASSWORD` in `.env` and run
  `npm run init:db -- --reset-owner-password`.
- **Start over completely** - stop the server, delete `server/data/qprint.db*`,
  run `npm run init:db` again. This deletes all orders, so only do it during
  development.

## Privacy

Uploaded documents and payment proofs are used only for printing. They are
deleted automatically after collection (Milestone 6). Order history without
files is kept for the shop owner.
